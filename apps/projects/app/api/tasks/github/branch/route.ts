import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { createGitHubBranchRef, deleteGitHubBranchRef, getGitHubRepositoryBranch, listGitHubInstallationRepositories } from "@/lib/github-app";
import { TaskGitHubError, getTaskForAccount, requireTaskGitHubContext, taskBranchName, type TaskGitHubBranch } from "@/lib/task-github-server";

export async function GET(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    const { accountId } = await requireTaskGitHubContext();
    await getTaskForAccount(taskId, accountId);
    const { data, error } = await createAdminClient().from("project_task_github_branches")
      .select("task_id, repository_full_name, base_branch, base_sha, branch_name").eq("task_id", taskId).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ branch: data as TaskGitHubBranch | null });
  } catch (error) {
    const status = error instanceof TaskGitHubError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load branch" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { taskId?: unknown; repository?: unknown; baseBranch?: unknown };
    if (typeof body.taskId !== "string" || typeof body.repository !== "string" || typeof body.baseBranch !== "string") {
      return NextResponse.json({ error: "taskId, repository, and baseBranch are required" }, { status: 400 });
    }
    const { userId, accountId, connection } = await requireTaskGitHubContext({ write: true });
    const task = await getTaskForAccount(body.taskId, accountId);
    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin.from("project_task_github_branches")
      .select("task_id, repository_full_name, base_branch, base_sha, branch_name").eq("task_id", task.id).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ branch: existing as TaskGitHubBranch, existing: true });
    const repositories = await listGitHubInstallationRepositories(connection.provider_account_id!);
    if (!repositories.some((repository) => repository.full_name === body.repository)) {
      throw new TaskGitHubError("Repository is not granted to this installation", 403);
    }
    const base = await getGitHubRepositoryBranch(connection.provider_account_id!, body.repository, body.baseBranch);
    const branchName = taskBranchName(task);
    await createGitHubBranchRef({ installationId: connection.provider_account_id!, repositoryFullName: body.repository, branchName, sha: base.sha });
    const row = { task_id: task.id, account_id: accountId, connection_id: connection.id, repository_full_name: body.repository, base_branch: base.branch, base_sha: base.sha, branch_name: branchName, created_by: userId };
    const { data, error } = await admin.from("project_task_github_branches").insert(row)
      .select("task_id, repository_full_name, base_branch, base_sha, branch_name").single();
    if (error?.code === "23505") {
      const { data: raced } = await admin.from("project_task_github_branches").select("task_id, repository_full_name, base_branch, base_sha, branch_name").eq("task_id", task.id).single();
      if (raced) return NextResponse.json({ branch: raced as TaskGitHubBranch, existing: true });
    }
    if (error) throw error;
    return NextResponse.json({ branch: data as TaskGitHubBranch }, { status: 201 });
  } catch (error) {
    const status = error instanceof TaskGitHubError ? error.status : 500;
    console.error("[projects] create task GitHub branch:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create branch" }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    const { accountId, connection } = await requireTaskGitHubContext({ write: true });
    await getTaskForAccount(taskId, accountId);
    const admin = createAdminClient();
    const { data: branch, error } = await admin.from("project_task_github_branches")
      .select("task_id, repository_full_name, branch_name").eq("task_id", taskId).maybeSingle();
    if (error) throw error;
    if (!branch) return NextResponse.json({ deleted: false, branch: null });
    await deleteGitHubBranchRef({ installationId: connection.provider_account_id!, repositoryFullName: branch.repository_full_name, branchName: branch.branch_name });
    const { error: unlinkError } = await admin.from("project_task_github_branches").delete().eq("task_id", taskId);
    if (unlinkError) throw unlinkError;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const status = error instanceof TaskGitHubError ? error.status : 500;
    console.error("[projects] delete task GitHub branch:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete branch" }, { status });
  }
}
