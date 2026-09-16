import { createAdminClient } from "@walls/supabase/admin";

import { getAccountMembership, getCurrentUserId, resolveActiveAccountId } from "@/lib/account-context";
import { getSafeGitHubConnectionForAccount } from "@/lib/github-connections-server";

export type TaskGitHubBranch = {
  task_id: string;
  repository_full_name: string;
  base_branch: string;
  base_sha: string;
  branch_name: string;
  branch_deleted_at?: string | null;
};

export async function requireTaskGitHubContext(options: { write?: boolean } = {}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new TaskGitHubError("Unauthorized", 401);
  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) throw new TaskGitHubError("No active account", 400);
  const membership = await getAccountMembership(userId, accountId);
  if (!membership) throw new TaskGitHubError("Not a member of this account", 403);
  if (options.write && !["owner", "admin"].includes(membership.role.toLowerCase())) {
    throw new TaskGitHubError("Only workspace owners and admins can create GitHub branches", 403);
  }
  const connection = await getSafeGitHubConnectionForAccount(accountId);
  if (!connection?.provider_account_id) throw new TaskGitHubError("No active GitHub connection", 404);
  return { userId, accountId, connection };
}

export async function getTaskForAccount(taskId: string, accountId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_tasks")
    .select("id, title, projects!inner(account_id)")
    .eq("id", taskId)
    .eq("projects.account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new TaskGitHubError("Task not found in active account", 404);
  return data as { id: string; title: string };
}

export function taskBranchName(task: { id: string; title: string }): string {
  const slug = task.title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "task";
  return `proj-${task.id.replace(/-/g, "").slice(0, 8)}/${slug}`;
}

export class TaskGitHubError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
