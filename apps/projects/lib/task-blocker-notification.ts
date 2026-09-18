import { createAdminClient } from "@walls/supabase/admin";

import { sendTaskBlockerCompletedEmail } from "@/lib/task-assignment-email";

export const TASK_BLOCKER_COMPLETED_ALERT_KEY = "projects.task_blocker_completed";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  project_id: string;
  projects: { account_id: string; name: string | null } | { account_id: string; name: string | null }[] | null;
};

type DependencyRow = { blocking_task_id: string; blocker_task_id: string };

/**
 * Sends one email to each opted-in assignee of a task blocked by `taskId`.
 * A unique key on the existing notification inbox makes this safe to call from
 * the browser completion flow and server-side automations alike.
 */
export async function notifyTaskAssigneesWhenBlockerCompletes({
  taskId,
  origin,
  skipUserId,
}: {
  taskId: string;
  origin: string;
  skipUserId?: string | null;
}): Promise<{ queued: number }> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[projects] task blocker notification service role:", error);
    return { queued: 0 };
  }

  const { data: blocker, error: blockerError } = await admin
    .from("project_tasks")
    .select("id, title, status, completed_at, project_id, projects(account_id, name)")
    .eq("id", taskId)
    .maybeSingle();
  const completedBlocker = blocker as TaskRow | null;
  if (blockerError || !completedBlocker || completedBlocker.status !== "completed" || !completedBlocker.completed_at) {
    return { queued: 0 };
  }

  const { data: dependencies, error: dependenciesError } = await admin
    .from("project_task_dependencies")
    .select("blocking_task_id, blocker_task_id")
    .eq("blocker_task_id", taskId);
  if (dependenciesError || !dependencies?.length) return { queued: 0 };

  const dependentIds = [...new Set((dependencies as DependencyRow[]).map((row) => row.blocking_task_id))];
  const [{ data: dependentTasks, error: dependentTasksError }, { data: allDependencies, error: allDependenciesError }, { data: assigneeLinks, error: assigneeLinksError }] = await Promise.all([
    admin.from("project_tasks").select("id, title, status, completed_at, project_id, projects(account_id, name)").in("id", dependentIds),
    admin.from("project_task_dependencies").select("blocking_task_id, blocker_task_id").in("blocking_task_id", dependentIds),
    admin.from("project_task_assignees").select("task_id, user_id").in("task_id", dependentIds),
  ]);
  if (dependentTasksError || allDependenciesError || assigneeLinksError) return { queued: 0 };

  const blockersByTask = new Map<string, string[]>();
  for (const row of (allDependencies ?? []) as DependencyRow[]) {
    const ids = blockersByTask.get(row.blocking_task_id) ?? [];
    ids.push(row.blocker_task_id);
    blockersByTask.set(row.blocking_task_id, ids);
  }
  const allBlockerIds = [...new Set((allDependencies ?? []).map((row: DependencyRow) => row.blocker_task_id))];
  const { data: blockerStatuses, error: blockerStatusesError } = await admin
    .from("project_tasks")
    .select("id, status")
    .in("id", allBlockerIds);
  if (blockerStatusesError) return { queued: 0 };
  const completedBlockerIds = new Set((blockerStatuses ?? []).filter((row) => row.status === "completed").map((row) => row.id as string));

  const assigneesByTask = new Map<string, Set<string>>();
  for (const link of assigneeLinks ?? []) {
    const ids = assigneesByTask.get(link.task_id as string) ?? new Set<string>();
    ids.add(link.user_id as string);
    assigneesByTask.set(link.task_id as string, ids);
  }

  const recipientIds = [...new Set([...assigneesByTask.values()].flatMap((ids) => [...ids]).filter((id) => id !== skipUserId))];
  if (!recipientIds.length) return { queued: 0 };

  const project = Array.isArray(completedBlocker.projects) ? completedBlocker.projects[0] : completedBlocker.projects;
  if (!project?.account_id) return { queued: 0 };
  const [{ data: preferences }, { data: recipients }] = await Promise.all([
    admin.from("alert_subscriptions").select("user_id, notify_email, enabled")
      .eq("account_id", project.account_id).eq("app_slug", process.env.NEXT_PUBLIC_PROJECTS_APP_SLUG || "projects")
      .eq("alert_key", TASK_BLOCKER_COMPLETED_ALERT_KEY).in("user_id", recipientIds),
    admin.from("users").select("id, email, first_name").in("id", recipientIds),
  ]);
  const optedIn = new Set((preferences ?? []).filter((row) => row.enabled && row.notify_email).map((row) => row.user_id as string));
  const recipientsById = new Map((recipients ?? []).filter((row) => row.email).map((row) => [row.id as string, row]));
  let queued = 0;

  for (const task of (dependentTasks ?? []) as TaskRow[]) {
    const assignees = assigneesByTask.get(task.id) ?? new Set<string>();
    const remainingBlockerCount = (blockersByTask.get(task.id) ?? []).filter((id) => !completedBlockerIds.has(id)).length;
    for (const recipientId of assignees) {
      if (!optedIn.has(recipientId)) continue;
      const recipient = recipientsById.get(recipientId);
      if (!recipient?.email) continue;
      const dedupeKey = [
        "projects.task_blocker_completed", completedBlocker.id, task.id,
        recipientId, completedBlocker.completed_at,
      ].join(":");
      const { data: notification, error: notificationError } = await admin
        .from("user_notifications")
        .upsert({
          user_id: recipientId,
          title: remainingBlockerCount === 0 ? "Your task is ready to start" : "A task blocker was completed",
          body: remainingBlockerCount === 0
            ? `“${completedBlocker.title}” was completed. “${task.title}” is now unblocked.`
            : `“${completedBlocker.title}” was completed. ${remainingBlockerCount} blocker${remainingBlockerCount === 1 ? "" : "s"} remain for “${task.title}”.`,
          type: "projects",
          redirect_url: `/tasks?project=${task.project_id}`,
          metadata: { kind: "task_blocker_completed", blocker_task_id: completedBlocker.id, blocking_task_id: task.id },
          dedupe_key: dedupeKey,
        }, { onConflict: "dedupe_key", ignoreDuplicates: true })
        .select("id")
        .maybeSingle();
      if (notificationError || !notification) continue;

      const result = await sendTaskBlockerCompletedEmail({
        to: recipient.email as string,
        blockerTaskTitle: completedBlocker.title, blockedTaskTitle: task.title,
        remainingBlockerCount,
        taskUrl: `${origin.replace(/\/$/, "")}/tasks?project=${task.project_id}`,
      });
      if (result.ok) queued += 1;
    }
  }
  return { queued };
}
