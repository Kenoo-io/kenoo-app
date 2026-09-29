import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { sendTaskAssignmentEmail } from "@/lib/task-assignment-email";
import { sendSlackTaskEventForAccount } from "@/lib/slack-task-notification-server";

const ASSIGNMENT_ALERT_KEY = "projects.task_assigned";
const APP_SLUG = process.env.NEXT_PUBLIC_PROJECTS_APP_SLUG || "projects";

type OutboxRow = {
  id: string;
  account_id: string;
  task_id: string;
  event_key: "task_created" | "task_assigned" | "task_status_changed";
  payload: { assignee_id?: string; initial_assignment?: boolean; specific_event_key?: string; actor_user_id?: string | null };
  attempts: number;
};

function authorized(request: Request) {
  const expected = (process.env.PROJECT_NOTIFICATION_WORKER_SECRET || process.env.CRON_SECRET)?.trim();
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

function backoff(attempts: number) {
  return new Date(Date.now() + Math.min(60, 2 ** Math.min(attempts, 5)) * 60_000).toISOString();
}

async function processAssignmentEmail(admin: ReturnType<typeof createAdminClient>, row: OutboxRow, recipientIds: string[]) {
  if (recipientIds.length === 0) return;
  const { data: task } = await admin.from("project_tasks").select("id, title, project_id, assigned_by, projects(name, account_id)").eq("id", row.task_id).maybeSingle();
  if (!task) return;
  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
  if (!project?.account_id) return;
  const ids = [...new Set(recipientIds.filter((id) => id && id !== task.assigned_by))];
  if (ids.length === 0) return;
  const [{ data: preferences }, { data: recipients }, { data: actor }] = await Promise.all([
    admin.from("alert_subscriptions").select("user_id, notify_email, enabled").eq("account_id", project.account_id).eq("app_slug", APP_SLUG).eq("alert_key", ASSIGNMENT_ALERT_KEY).in("user_id", ids),
    admin.from("users").select("id, email, first_name").in("id", ids),
    admin.from("users").select("first_name, last_name, email").eq("id", task.assigned_by).maybeSingle(),
  ]);
  const optedIn = new Set((preferences ?? []).filter((preference) => preference.enabled && preference.notify_email).map((preference) => preference.user_id as string));
  const recipientsById = new Map((recipients ?? []).filter((recipient) => recipient.email && optedIn.has(recipient.id as string)).map((recipient) => [recipient.id as string, recipient]));
  const actorName = `${actor?.first_name ?? ""} ${actor?.last_name ?? ""}`.trim() || actor?.email || "Someone";
  const origin = process.env.NEXT_PUBLIC_PROJECTS_URL?.replace(/\/$/, "") || "https://projects.kenoo.io";
  await Promise.all([...recipientsById.values()].map((recipient) => sendTaskAssignmentEmail({
    to: recipient.email as string,
    recipientFirstName: recipient.first_name,
    actorName,
    taskTitle: task.title,
    projectName: project.name,
    taskUrl: `${origin}/tasks?project=${task.project_id}`,
  })));
}

async function processRow(admin: ReturnType<typeof createAdminClient>, row: OutboxRow) {
  if (row.event_key === "task_created") {
    const sent = await sendSlackTaskEventForAccount({ accountId: row.account_id, taskId: row.task_id, eventKey: "task_created" });
    return sent === 0;
  } else if (row.event_key === "task_assigned") {
    await Promise.all([
      row.payload.initial_assignment ? Promise.resolve(0) : sendSlackTaskEventForAccount({ accountId: row.account_id, taskId: row.task_id, eventKey: "task_assigned", assigneeIds: row.payload.assignee_id ? [row.payload.assignee_id] : undefined }),
      processAssignmentEmail(admin, row, row.payload.assignee_id ? [row.payload.assignee_id] : []),
    ]);
    return false;
  } else {
    const sent = await sendSlackTaskEventForAccount({ accountId: row.account_id, taskId: row.task_id, eventKey: "task_status_changed", specificEventKey: row.payload.specific_event_key as "task_completed" | "task_blocked" | "task_unblocked" | undefined });
    return sent === 0;
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: rows, error } = await admin.rpc("claim_project_notification_outbox", { p_limit: 50 });
  if (error) return NextResponse.json({ error: "Unable to claim notification jobs", detail: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  for (const row of (rows ?? []) as OutboxRow[]) {
    try {
      const wasSkipped = await processRow(admin, row);
      await admin.from("project_notification_outbox").update({ status: wasSkipped ? "skipped" : "sent", sent_at: wasSkipped ? null : new Date().toISOString(), locked_at: null, last_error: null, updated_at: new Date().toISOString() }).eq("id", row.id);
      if (wasSkipped) skipped += 1;
      else sent += 1;
    } catch (error) {
      const attempts = Number(row.attempts ?? 0) + 1;
      await admin.from("project_notification_outbox").update({ status: "failed", attempts, next_attempt_at: backoff(attempts), locked_at: null, last_error: error instanceof Error ? error.message : "Notification delivery failed", updated_at: new Date().toISOString() }).eq("id", row.id);
    }
  }
  return NextResponse.json({ ok: true, claimed: rows?.length ?? 0, sent, skipped });
}
