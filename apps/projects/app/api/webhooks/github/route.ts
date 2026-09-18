import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@walls/supabase/admin";
import { setGitHubInstallationConnectionActive } from "@/lib/github-connections-server";
import { hasMergedGitHubPullRequest } from "@/lib/github-app";
import { notifyTaskAssigneesWhenBlockerCompletes } from "@/lib/task-blocker-notification";

type Payload = {
  action?: string;
  installation?: { id?: number };
  repository?: { full_name?: string };
  ref?: string;
  ref_type?: string;
  commits?: unknown[];
  pull_request?: { merged?: boolean; head?: { ref?: string }; base?: { ref?: string } };
  deployment?: { ref?: string; environment?: string };
  deployment_status?: { state?: string; environment?: string };
};

type TaskBranchRow = { task_id: string; connection_id: string };
type RepositoryAutomation = {
  connection_id: string;
  repository_full_name: string;
  completion_mode: "merge" | "deployment";
  completion_branch: string | null;
  deployment_environment: string | null;
};

function normalizeBranch(ref: string | undefined) {
  return ref?.replace(/^refs\/heads\//, "");
}

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
  if (event === "push") {
    branch = normalizeBranch(payload.ref);
    // Creating a branch points it at an existing commit and produces a push
    // webhook with no commits. It is only setup, not work in progress.
    status = branch && (payload.commits?.length ?? 0) > 0
      ? "in_progress"
      : undefined;
  }
  if (event === "pull_request") {
    branch = payload.pull_request?.head?.ref;
    if (payload.action === "opened") status = "in_review";
  }
  if (event === "deployment_status" && payload.deployment_status?.state === "success") {
    branch = normalizeBranch(payload.deployment?.ref);
  }
  if (!branch) return;
  const admin = createAdminClient();
  const query = admin.from("project_task_github_branches").select("task_id, connection_id")
    .eq("repository_full_name", repository).eq("branch_name", branch);
  const { data, error } = await query;
  if (error) throw error;
  const taskBranches = (data ?? []) as TaskBranchRow[];
  const taskIds = taskBranches.map((row) => row.task_id);
  if (!taskIds.length) return;

  if (event === "pull_request" && payload.pull_request?.merged) {
    const connectionIds = [...new Set(taskBranches.map((row) => row.connection_id))];
    const { data: automations, error: automationsError } = await admin
      .from("project_github_repository_automations")
      .select("connection_id, repository_full_name, completion_mode, completion_branch, deployment_environment")
      .eq("repository_full_name", repository)
      .in("connection_id", connectionIds);
    if (automationsError) throw automationsError;
    const automationByConnection = new Map((automations ?? []).map((row) => [row.connection_id as string, row as RepositoryAutomation]));
    const mergeTarget = payload.pull_request.base?.ref;
    const completedTaskIds = taskBranches
      .filter((taskBranch) => {
        const automation = automationByConnection.get(taskBranch.connection_id);
        return (automation?.completion_mode ?? "merge") === "merge"
          && (automation?.completion_branch ?? "main") === mergeTarget;
      })
      .map((taskBranch) => taskBranch.task_id);
    if (!completedTaskIds.length) return;
    status = "completed";
    taskIds.splice(0, taskIds.length, ...completedTaskIds);
  }

  if (event === "deployment_status" && payload.deployment_status?.state === "success") {
    const connectionIds = [...new Set(taskBranches.map((row) => row.connection_id))];
    const { data: automations, error: automationsError } = await admin
      .from("project_github_repository_automations")
      .select("connection_id, repository_full_name, completion_mode, completion_branch, deployment_environment")
      .eq("repository_full_name", repository)
      .in("connection_id", connectionIds);
    if (automationsError) throw automationsError;
    const automationByConnection = new Map((automations ?? []).map((row) => [row.connection_id as string, row as RepositoryAutomation]));
    const environment = payload.deployment_status.environment ?? payload.deployment?.environment;
    const completedTaskIds = taskBranches
      .filter((taskBranch) => {
        const automation = automationByConnection.get(taskBranch.connection_id);
        return (automation?.completion_mode ?? "merge") === "deployment"
          && (automation?.deployment_environment ?? "production") === environment;
      })
      .map((taskBranch) => taskBranch.task_id);
    if (!completedTaskIds.length) return;
    status = "completed";
    taskIds.splice(0, taskIds.length, ...completedTaskIds);
  }

  if (!status) return;
  const previouslyCompletedIds = status === "completed"
    ? (await admin.from("project_tasks").select("id").in("id", taskIds).eq("status", "completed")).data?.map((row) => row.id as string) ?? []
    : [];
  const update = status === "completed" ? { status, completed_at: new Date().toISOString() } : { status, completed_at: null };
  const { error: updateError } = await admin.from("project_tasks").update(update).in("id", taskIds);
  if (updateError) throw updateError;
  if (status === "completed") {
    const completedNow = taskIds.filter((id) => !previouslyCompletedIds.includes(id));
    const origin = process.env.NEXT_PUBLIC_PROJECTS_URL?.replace(/\/$/, "") || "https://projects.kenoo.io";
    await Promise.all(completedNow.map((taskId) => notifyTaskAssigneesWhenBlockerCompletes({ taskId, origin })));
  }
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
