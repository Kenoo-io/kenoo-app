import type { SupabaseClient } from "@supabase/supabase-js";

export const PROJECT_NOTIFICATION_TYPE = "projects";
export const SCOUTER_NOTIFICATION_TYPE = "scouter";
export const SCOUTER_INDEX_URL = "/agents/scouter";
export const PROJECTS_INTERNAL_ALERT_KEY = "projects.internal";
export const PROJECTS_INTERNAL_EVENT_KEYS = {
  projectMemberAdded: "projects.internal.project_member_added",
  taskAssigned: "projects.internal.task_assigned",
  taskCompleted: "projects.internal.task_completed",
  taskBlockerCompleted: "projects.internal.task_blocker_completed",
} as const;
export type ProjectsInternalEventKey = keyof typeof PROJECTS_INTERNAL_EVENT_KEYS;

export type UserNotificationInsert = {
  user_id: string;
  title: string;
  body?: string | null;
  type?: string | null;
  redirect_url?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupe_key?: string | null;
};

export async function insertUserNotifications(
  supabase: SupabaseClient,
  notifications: UserNotificationInsert[]
): Promise<void> {
  if (notifications.length === 0) return;

  const rows = notifications.map((n) => ({
    user_id: n.user_id,
    title: n.title,
    body: n.body ?? null,
    type: n.type ?? "info",
    redirect_url: n.redirect_url ?? null,
    metadata: n.metadata ?? null,
    dedupe_key: n.dedupe_key ?? null,
  }));

  const { error } = await supabase.from("user_notifications").insert(rows);
  if (error) {
    console.error("Failed to insert user notifications:", error);
  }
}

/** Keep project inbox delivery opt-in/out separate from email and Slack. */
export async function filterInternalNotificationRecipients(
  supabase: SupabaseClient,
  projectId: string,
  userIds: string[],
  eventKey: ProjectsInternalEventKey = "taskAssigned",
): Promise<string[]> {
  const recipients = [...new Set(userIds.filter(Boolean))];
  if (!recipients.length) return [];
  const { data: project } = await supabase.from("projects").select("account_id").eq("id", projectId).maybeSingle();
  if (!project?.account_id) return recipients;
  const { data: preferences } = await supabase
    .from("alert_subscriptions")
    .select("user_id, alert_key, notify_email, enabled")
    .eq("account_id", project.account_id)
    .eq("app_slug", "projects")
    .in("alert_key", [PROJECTS_INTERNAL_EVENT_KEYS[eventKey], PROJECTS_INTERNAL_ALERT_KEY])
    .in("user_id", recipients);
  const disabled = new Set<string>();
  for (const recipient of recipients) {
    const rows = (preferences ?? []).filter((row) => row.user_id === recipient);
    const eventPreference = rows.find((row) => row.alert_key === PROJECTS_INTERNAL_EVENT_KEYS[eventKey]);
    const globalPreference = rows.find((row) => row.alert_key === PROJECTS_INTERNAL_ALERT_KEY);
    const preference = eventPreference ?? globalPreference;
    if (preference?.enabled === false || preference?.notify_email === false) disabled.add(recipient);
  }
  return recipients.filter((id) => !disabled.has(id));
}

export function projectBoardUrl(projectId: string): string {
  return `/tasks?project=${projectId}`;
}

/**
 * Delivers the optional transactional email after the client has saved an
 * assignment. The server independently verifies the assignment and recipient.
 */
export async function sendTaskAssignmentEmail(options: {
  taskId: string;
  assigneeId: string;
}): Promise<void> {
  try {
    await fetch("/api/notifications/task-assigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
  } catch (error) {
    // An email delivery issue must never prevent the task itself from saving.
    console.error("Failed to request task assignment email:", error);
  }
}

/** Requests blocker-completion email delivery after a task status transitions. */
export async function sendTaskBlockerCompletedEmail(options: { taskId: string }): Promise<{ unblockedTaskIds: string[] }> {
  try {
    const response = await fetch("/api/notifications/task-blocker-completed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    if (!response.ok) return { unblockedTaskIds: [] };
    const result = (await response.json()) as { unblockedTaskIds?: unknown };
    return {
      unblockedTaskIds: Array.isArray(result.unblockedTaskIds)
        ? result.unblockedTaskIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch (error) {
    // Email delivery is secondary to completing the task.
    console.error("Failed to request task blocker email:", error);
    return { unblockedTaskIds: [] };
  }
}

/** Ask the authenticated Projects server to create an internal notification. */
export async function requestProjectInternalNotification(options: {
  event: "project_member_added" | "task_assigned" | "task_completed";
  projectId?: string;
  userIds?: string[];
  taskId?: string;
}): Promise<void> {
  try {
    await fetch("/api/notifications/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
  } catch (error) {
    console.error("Failed to request project internal notification:", error);
  }
}

/** Scouter notifications open the index, not a specific profile sheet. */
export function scouterNotificationUrl(): string {
  return SCOUTER_INDEX_URL;
}

export async function resolveTeamMemberUserId(
  supabase: SupabaseClient,
  teamOrUserId: string | null | undefined
): Promise<string | null> {
  if (!teamOrUserId) return null;

  const { data: teamRow } = await supabase
    .from("team")
    .select("user_id")
    .eq("id", teamOrUserId)
    .maybeSingle();

  if (teamRow?.user_id) return teamRow.user_id;

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("id", teamOrUserId)
    .maybeSingle();

  return userRow?.id ?? teamOrUserId;
}

export async function notifyScouterProfileAssigned(
  supabase: SupabaseClient,
  options: {
    assigneeTeamId: string;
    profileId: string;
    profileName: string;
    actorUserId: string | null | undefined;
    actorName: string;
  }
): Promise<void> {
  const { assigneeTeamId, profileId, profileName, actorUserId, actorName } = options;
  const assigneeUserId = await resolveTeamMemberUserId(supabase, assigneeTeamId);
  if (!assigneeUserId || assigneeUserId === actorUserId) return;

  await insertUserNotifications(supabase, [
    {
      user_id: assigneeUserId,
      title: "New scouter profile assigned",
      body: `${actorName} assigned you ${profileName}`,
      type: SCOUTER_NOTIFICATION_TYPE,
      redirect_url: scouterNotificationUrl(),
      metadata: {
        kind: "scouter_profile_assigned",
        profile_id: profileId,
        assigned_by: actorUserId ?? null,
        scouted_by: assigneeTeamId,
      },
    },
  ]);
}

export async function notifyProjectMembersAdded(
  supabase: SupabaseClient,
  options: {
    userIds: string[];
    projectId: string;
    projectName: string;
    actorUserId: string | null | undefined;
    actorName: string;
  }
): Promise<void> {
  const { userIds, projectId, projectName, actorUserId, actorName } = options;
  const recipients = await filterInternalNotificationRecipients(supabase, projectId, userIds.filter((id) => id && id !== actorUserId), "projectMemberAdded");
  if (recipients.length === 0) return;

  await insertUserNotifications(
    supabase,
    recipients.map((userId) => ({
      user_id: userId,
      title: "Added to project",
      body: `${actorName} added you to "${projectName}"`,
      type: PROJECT_NOTIFICATION_TYPE,
      redirect_url: projectBoardUrl(projectId),
      metadata: {
        kind: "project_member_added",
        project_id: projectId,
        added_by: actorUserId ?? null,
      },
    }))
  );
}

export async function notifyTaskAssignee(
  supabase: SupabaseClient,
  options: {
    assigneeId: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName?: string | null;
    actorUserId: string | null | undefined;
    actorName: string;
  }
): Promise<void> {
  const { assigneeId, taskId, taskTitle, projectId, projectName, actorUserId, actorName } =
    options;

  if (!assigneeId || assigneeId === actorUserId) return;
  if (!(await filterInternalNotificationRecipients(supabase, projectId, [assigneeId], "taskAssigned")).includes(assigneeId)) return;

  const projectLabel = projectName ? ` in "${projectName}"` : "";

  await insertUserNotifications(supabase, [
    {
      user_id: assigneeId,
      title: "Task assigned to you",
      body: `${actorName} assigned you "${taskTitle}"${projectLabel}`,
      type: PROJECT_NOTIFICATION_TYPE,
      redirect_url: projectBoardUrl(projectId),
      metadata: {
        kind: "task_assigned",
        task_id: taskId,
        project_id: projectId,
        assigned_by: actorUserId ?? null,
      },
    },
  ]);
}

type TaskCompletionNotifyRow = {
  id: string;
  title: string;
  project_id: string;
  assigned_by: string | null;
  assignees?: { id: string }[] | null;
  projects?: { name: string } | { name: string }[] | null;
};

function projectNameFromTaskRow(
  projects: TaskCompletionNotifyRow["projects"]
): string | null {
  if (!projects) return null;
  const row = Array.isArray(projects) ? projects[0] : projects;
  return row?.name ?? null;
}

function taskHasAssignee(
  task: TaskCompletionNotifyRow,
  userId: string
): boolean {
  return task.assignees?.some((assignee) => assignee.id === userId) ?? false;
}

/** Notify `assigned_by` when the assignee marks a task complete. */
export async function notifyTaskAssignerOnComplete(
  supabase: SupabaseClient,
  options: {
    assignerId: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName?: string | null;
    completerUserId: string | null | undefined;
    completerName: string;
  }
): Promise<void> {
  const {
    assignerId,
    taskId,
    taskTitle,
    projectId,
    projectName,
    completerUserId,
    completerName,
  } = options;

  if (!assignerId || assignerId === completerUserId) return;
  if (!(await filterInternalNotificationRecipients(supabase, projectId, [assignerId], "taskCompleted")).includes(assignerId)) return;

  const projectLabel = projectName ? ` in "${projectName}"` : "";

  await insertUserNotifications(supabase, [
    {
      user_id: assignerId,
      title: "Task completed",
      body: `${completerName} completed "${taskTitle}"${projectLabel}`,
      type: PROJECT_NOTIFICATION_TYPE,
      redirect_url: projectBoardUrl(projectId),
      metadata: {
        kind: "task_completed",
        task_id: taskId,
        project_id: projectId,
        completed_by: completerUserId ?? null,
      },
    },
  ]);
}

export async function notifyAssignersForCompletedTasks(
  supabase: SupabaseClient,
  tasks: TaskCompletionNotifyRow[],
  completerUserId: string,
  completerName: string
): Promise<void> {
  await Promise.all(
    tasks.map((task) => {
      if (!task.assigned_by || task.assigned_by === completerUserId) {
        return Promise.resolve();
      }
      if (!taskHasAssignee(task, completerUserId)) {
        return Promise.resolve();
      }
      return notifyTaskAssignerOnComplete(supabase, {
        assignerId: task.assigned_by,
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.project_id,
        projectName: projectNameFromTaskRow(task.projects),
        completerUserId,
        completerName,
      });
    })
  );
}

export async function resolveActorDisplayName(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<string> {
  if (!userId) return "Someone";

  const { data } = await supabase
    .from("users")
    .select("first_name, last_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return "Someone";

  const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
  return name || data.email || "Someone";
}
