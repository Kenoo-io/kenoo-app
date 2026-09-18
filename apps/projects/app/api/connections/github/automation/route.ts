import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { listGitHubInstallationRepositories, listGitHubRepositoryBranches } from "@/lib/github-app";
import { TaskGitHubError, requireTaskGitHubContext } from "@/lib/task-github-server";

type CompletionMode = "merge" | "deployment";

function isCompletionMode(value: unknown): value is CompletionMode {
  return value === "merge" || value === "deployment";
}

export async function GET() {
  try {
    const { accountId, connection } = await requireTaskGitHubContext();
    const { data, error } = await createAdminClient()
      .from("project_github_repository_automations")
      .select("repository_full_name, completion_mode, completion_branch, deployment_environment")
      .eq("account_id", accountId)
      .eq("connection_id", connection.id)
      .order("repository_full_name");
    if (error) throw error;
    return NextResponse.json({ automations: data ?? [] });
  } catch (error) {
    const status = error instanceof TaskGitHubError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to load repository automation settings";
    if (message.includes("project_github_repository_automations")) {
      return NextResponse.json({ error: "Apply the Projects GitHub automation database migration to enable completion settings." }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      repository?: unknown;
      completionMode?: unknown;
      completionBranch?: unknown;
      deploymentEnvironment?: unknown;
    };
    if (typeof body.repository !== "string" || !isCompletionMode(body.completionMode)) {
      return NextResponse.json({ error: "repository and completionMode are required" }, { status: 400 });
    }

    const { accountId, connection } = await requireTaskGitHubContext({ write: true });
    const repositories = await listGitHubInstallationRepositories(connection.provider_account_id!);
    if (!repositories.some((repository) => repository.full_name === body.repository)) {
      return NextResponse.json({ error: "Repository is not granted to this installation" }, { status: 403 });
    }

    const completionBranch = typeof body.completionBranch === "string" ? body.completionBranch.trim() : "";
    const deploymentEnvironment = typeof body.deploymentEnvironment === "string" ? body.deploymentEnvironment.trim() : "";
    if (body.completionMode === "merge") {
      if (!completionBranch) return NextResponse.json({ error: "A completion branch is required" }, { status: 400 });
      const branches = await listGitHubRepositoryBranches(connection.provider_account_id!, body.repository);
      if (!branches.includes(completionBranch)) return NextResponse.json({ error: "Choose a branch available in this repository" }, { status: 400 });
    }
    if (body.completionMode === "deployment" && !deploymentEnvironment) {
      return NextResponse.json({ error: "A deployment environment is required" }, { status: 400 });
    }

    const row = {
      account_id: accountId,
      connection_id: connection.id,
      repository_full_name: body.repository,
      completion_mode: body.completionMode,
      completion_branch: body.completionMode === "merge" ? completionBranch : null,
      deployment_environment: body.completionMode === "deployment" ? deploymentEnvironment : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await createAdminClient()
      .from("project_github_repository_automations")
      .upsert(row, { onConflict: "connection_id,repository_full_name" })
      .select("repository_full_name, completion_mode, completion_branch, deployment_environment")
      .single();
    if (error) throw error;
    return NextResponse.json({ automation: data });
  } catch (error) {
    const status = error instanceof TaskGitHubError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to save repository automation settings";
    if (message.includes("project_github_repository_automations")) {
      return NextResponse.json({ error: "Apply the Projects GitHub automation database migration before saving completion settings." }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status });
  }
}
