import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@walls/supabase/admin";
import { setGitHubInstallationConnectionActive } from "@/lib/github-connections-server";
import { hasMergedGitHubPullRequest } from "@/lib/github-app";

type Payload = {
  action?: string;
  installation?: { id?: number };
  repository?: { full_name?: string };
  ref?: string;
  ref_type?: string;
  pull_request?: { merged?: boolean; head?: { ref?: string }; base?: { ref?: string } };
  deployment?: { ref?: string; environment?: string };
  deployment_status?: { state?: string; environment?: string };
};

function validSignature(body: string, signature: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
  const left = Buffer.from(signature, "utf8"); const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

async function transition(event: string | null, payload: Payload) {
  const repository = payload.repository?.full_name;
  if (!repository) return;
  let branch: string | undefined;
  let status: "in_progress" | "in_review" | "completed" | undefined;
  if (event === "push") { branch = payload.ref?.replace(/^refs\/heads\//, ""); status = branch ? "in_progress" : undefined; }
  if (event === "pull_request") {
    branch = payload.pull_request?.head?.ref;
    if (payload.action === "opened") status = "in_review";
    // Ready for QA is not a task status yet; staging merges stay In Review.
    if (payload.pull_request?.merged && payload.pull_request.base?.ref === "staging") status = "in_review";
  }
  if (event === "deployment_status" && payload.deployment_status?.state === "success" && /^(production|prod)$/i.test(payload.deployment_status.environment ?? payload.deployment?.environment ?? "")) {
    branch = payload.deployment?.ref;
    // Deployment notifications without a ref cannot be safely associated with
    // one task branch, so they never complete every task in a repository.
    status = branch ? "completed" : undefined;
  }
  if (!status) return;
  const admin = createAdminClient();
  let query = admin.from("project_task_github_branches").select("task_id").eq("repository_full_name", repository);
  if (branch) query = query.eq("branch_name", branch);
  const { data, error } = await query;
  if (error) throw error;
  const taskIds = (data ?? []).map((row) => row.task_id as string);
  if (!taskIds.length) return;
  const update = status === "completed" ? { status, completed_at: new Date().toISOString() } : { status, completed_at: null };
  const { error: updateError } = await admin.from("project_tasks").update(update).in("id", taskIds);
  if (updateError) throw updateError;
}

async function recordPullRequestMerge(payload: Payload) {
  const repository = payload.repository?.full_name;
  const branch = payload.pull_request?.head?.ref;
  if (!repository || !branch || !payload.pull_request?.merged) return;
  const { error } = await createAdminClient()
    .from("project_task_github_branches")
    .update({ pull_request_merged_at: new Date().toISOString() })
    .eq("repository_full_name", repository)
    .eq("branch_name", branch);
  if (error) throw error;
}

async function handleBranchDeletion(payload: Payload) {
  const repository = payload.repository?.full_name;
  const branch = payload.ref;
  if (payload.ref_type !== "branch" || !repository || !branch) return;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_task_github_branches")
    .select("task_id, pull_request_merged_at")
    .eq("repository_full_name", repository)
    .eq("branch_name", branch);
  if (error) throw error;

  const hasPersistedMerge = (data ?? []).some((row) => Boolean(row.pull_request_merged_at));
  const installationId = payload.installation?.id;
  const hasMergedPullRequest = hasPersistedMerge || (installationId
    ? await hasMergedGitHubPullRequest({ installationId: String(installationId), repositoryFullName: repository, branchName: branch })
    : false);
  const unmergedTaskIds = hasMergedPullRequest ? [] : (data ?? []).map((row) => row.task_id as string);
  const mergedTaskIds = hasMergedPullRequest ? (data ?? []).map((row) => row.task_id as string) : [];
  if (unmergedTaskIds.length) {
    const { error: unlinkError } = await admin.from("project_task_github_branches").delete().in("task_id", unmergedTaskIds);
    if (unlinkError) throw unlinkError;
  }
  if (mergedTaskIds.length) {
    const { error: archiveError } = await admin
      .from("project_task_github_branches")
      .update({ branch_deleted_at: new Date().toISOString() })
      .in("task_id", mergedTaskIds)
      .is("branch_deleted_at", null);
    if (archiveError) throw archiveError;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  let payload: Payload;
  try { payload = JSON.parse(body) as Payload; } catch { return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 }); }
  const event = request.headers.get("x-github-event");
  const hash = createHash("sha256").update(body).digest("hex");
  const deliveryId = request.headers.get("x-github-delivery") ?? hash;
  const admin = createAdminClient();
  const { error: receiptError } = await admin.from("project_github_webhook_deliveries").insert({ delivery_id: deliveryId, event_name: event ?? "unknown", payload_hash: hash });
  if (receiptError?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  if (receiptError) return NextResponse.json({ error: "Webhook receipt failed" }, { status: 500 });
  try {
    const installationId = payload.installation?.id;
    if (event === "installation" && installationId) {
      if (["deleted", "suspend"].includes(payload.action ?? "")) await setGitHubInstallationConnectionActive({ installationId: String(installationId), active: false });
      if (payload.action === "unsuspend") await setGitHubInstallationConnectionActive({ installationId: String(installationId), active: true });
    }
    if (event === "pull_request") await recordPullRequestMerge(payload);
    if (event === "delete") await handleBranchDeletion(payload);
    // check_run/check_suite and pull_request_review are recorded but never infer completion.
    if (["push", "pull_request", "pull_request_review", "check_run", "check_suite", "deployment", "deployment_status"].includes(event ?? "")) await transition(event, payload);
    await admin.from("project_github_webhook_deliveries").update({ processed_at: new Date().toISOString() }).eq("delivery_id", deliveryId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[projects] GitHub webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
