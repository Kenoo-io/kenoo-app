import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";
import { resolveActiveAccountId } from "@/lib/account-context";
import { formatSlackTaskStatus, sendSlackMessage, SLACK_PROVIDER, SLACK_SERVICE } from "@/lib/slack";

const EVENT_KEYS = new Set(["task_created", "task_assigned", "task_status_changed"]);
const SPECIFIC_STATUS_KEYS = new Set(["task_completed", "task_blocked", "task_unblocked"]);

function escapeSlack(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function displayName(user: { first_name?: string | null; last_name?: string | null; email?: string | null }) {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email || "Unknown person";
}

function formatDate(value: string | null) {
  if (!value) return "No deadline";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

async function getAccount() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  return { user, accountId: user ? await resolveActiveAccountId(user.id) : null };
}

export async function POST(request: Request) {
  const { user, accountId } = await getAccount();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });
  const body = await request.json().catch(() => ({})) as { taskId?: unknown; eventKey?: unknown; assigneeIds?: unknown; specificEventKey?: unknown };
  if (typeof body.taskId !== "string" || typeof body.eventKey !== "string" || !EVENT_KEYS.has(body.eventKey)) return NextResponse.json({ error: "A valid task event is required" }, { status: 400 });
  if (body.specificEventKey !== undefined && (typeof body.specificEventKey !== "string" || !SPECIFIC_STATUS_KEYS.has(body.specificEventKey))) return NextResponse.json({ error: "Invalid specific status event" }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: task }, { data: connection }] = await Promise.all([
    admin.from("project_tasks").select("id, project_id, title, description, status, priority, due_date, created_at, updated_at, projects!inner(name, account_id)").eq("id", body.taskId).eq("projects.account_id", accountId).maybeSingle(),
    admin.from("account_connections").select("id, access_token").eq("account_id", accountId).eq("provider", SLACK_PROVIDER).eq("service", SLACK_SERVICE).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!task || !connection) return NextResponse.json({ ok: true, sent: 0 });

  const [{ data: assigneeRows }, { data: rules, error: rulesError }, { data: mappingRows }] = await Promise.all([
    admin.from("project_task_assignees").select("user_id, user:users!project_task_assignees_user_id_fkey(id, first_name, last_name, email)").eq("task_id", task.id),
    admin.from("project_slack_notification_rules").select("id, channel_id").eq("account_id", accountId).eq("enabled", true),
    admin.from("slack_user_mappings").select("kenoo_user_id, slack_user_id").eq("account_id", accountId).eq("connection_id", connection.id).eq("active", true),
  ]);
  if (rulesError) {
    console.error("[projects] load Slack task notification rules:", rulesError);
    return NextResponse.json({ error: "Unable to load Slack notification rules" }, { status: 500 });
  }
  const ruleIds = (rules ?? []).map((rule) => rule.id as string);
  const channelIds = [...new Set((rules ?? []).map((rule) => rule.channel_id as string))];
  const [{ data: channelRows, error: channelError }, { data: eventRows, error: eventsError }, { data: projectRows, error: projectsError }] = await Promise.all([
    channelIds.length > 0 ? admin.from("project_slack_channels").select("id, slack_channel_id").in("id", channelIds) : Promise.resolve({ data: [], error: null }),
    ruleIds.length > 0 ? admin.from("project_slack_notification_rule_events").select("rule_id, event_key").in("rule_id", ruleIds) : Promise.resolve({ data: [], error: null }),
    ruleIds.length > 0 ? admin.from("project_slack_notification_rule_projects").select("rule_id, project_id").in("rule_id", ruleIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (channelError || eventsError || projectsError) {
    console.error("[projects] load Slack task notification details:", channelError ?? eventsError ?? projectsError);
    return NextResponse.json({ error: "Unable to load Slack notification details" }, { status: 500 });
  }
  const channelById = new Map((channelRows ?? []).map((channel) => [channel.id as string, channel.slack_channel_id as string]));
  const eventsByRule = new Map<string, Set<string>>();
  for (const row of (eventRows ?? []) as Array<{ rule_id: string; event_key: string }>) eventsByRule.set(row.rule_id, new Set([...(eventsByRule.get(row.rule_id) ?? []), row.event_key]));
  const projectsByRule = new Map<string, Set<string>>();
  for (const row of (projectRows ?? []) as Array<{ rule_id: string; project_id: string }>) projectsByRule.set(row.rule_id, new Set([...(projectsByRule.get(row.rule_id) ?? []), row.project_id]));

  const requestedAssigneeIds = Array.isArray(body.assigneeIds) ? body.assigneeIds.filter((id): id is string => typeof id === "string") : [];
  const assignees = (assigneeRows ?? []).map((row) => {
    const raw = row.user as unknown;
    const person = Array.isArray(raw) ? raw[0] : raw;
    return { id: row.user_id as string, name: person ? displayName(person as { first_name?: string | null; last_name?: string | null; email?: string | null }) : "Unknown person" };
  });
  const mappedSlackIds = new Map((mappingRows ?? []).map((mapping) => [mapping.kenoo_user_id as string, mapping.slack_user_id as string]));
  const selectedAssignees = body.eventKey === "task_assigned" && requestedAssigneeIds.length > 0 ? assignees.filter((assignee) => requestedAssigneeIds.includes(assignee.id)) : assignees;
  const assigneeText = selectedAssignees.length > 0 ? selectedAssignees.map((assignee) => mappedSlackIds.get(assignee.id) ? `<@${mappedSlackIds.get(assignee.id)}>` : `@${escapeSlack(assignee.name)}`).join(", ") : "Unassigned";

  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
  const matchingRules = (rules ?? []).filter((rule) => {
    const events = eventsByRule.get(rule.id as string) ?? new Set<string>();
    const projects = projectsByRule.get(rule.id as string) ?? new Set<string>();
    return (projects.size === 0 || projects.has(task.project_id as string)) && events.size > 0;
  });
  const channelEvents = new Map<string, Set<string>>();
  for (const rule of matchingRules) {
    const slackChannelId = channelById.get(rule.channel_id as string);
    if (!slackChannelId) continue;
    const configured = channelEvents.get(slackChannelId) ?? new Set<string>();
    for (const eventKey of eventsByRule.get(rule.id as string) ?? []) configured.add(eventKey);
    channelEvents.set(slackChannelId, configured);
  }
  const channels = new Map<string, string>();
  for (const [channelId, configured] of channelEvents) {
    if (body.eventKey === "task_status_changed") {
      const specificEventKey = typeof body.specificEventKey === "string" ? body.specificEventKey : null;
      if (specificEventKey && configured.has(specificEventKey)) channels.set(channelId, specificEventKey);
      else if (configured.has("task_status_changed")) channels.set(channelId, "task_status_changed");
    } else if (configured.has(body.eventKey)) {
      channels.set(channelId, body.eventKey);
    }
  }
  if (channels.size === 0) return NextResponse.json({ ok: true, sent: 0 });

  const title = escapeSlack(String(task.title ?? "Untitled task"));
  const projectName = escapeSlack(String(project?.name ?? "Unknown Project"));
  const textForEvent = (eventKey: string) => eventKey === "task_created"
    ? `:sparkles: *New task created*\n*${title}*\nProject: ${projectName}\nStatus: ${escapeSlack(String(task.status ?? "Not started"))}\nPriority: ${escapeSlack(String(task.priority ?? "Not set"))}\nDeadline: ${escapeSlack(formatDate(task.due_date as string | null))}\nAssignees: ${assigneeText}${task.description ? `\nDescription: ${escapeSlack(String(task.description).slice(0, 500))}` : ""}`
    : eventKey === "task_assigned"
      ? `:busts_in_silhouette: *Assignees updated*\n*${title}* now includes ${assigneeText}.\nProject: ${projectName}\nDeadline: ${escapeSlack(formatDate(task.due_date as string | null))}`
      : eventKey === "task_completed"
        ? `:white_check_mark: *Task completed*\n*${title}*\nProject: ${projectName}\nCompleted with assignees: ${assigneeText}`
        : eventKey === "task_blocked"
          ? `:no_entry_sign: *Task blocked*\n*${title}*\nProject: ${projectName}\nAssignees: ${assigneeText}`
          : eventKey === "task_unblocked"
            ? `:large_green_circle: *Task unblocked*\n*${title}*\nProject: ${projectName}\nAssignees: ${assigneeText}`
            : `:arrows_counterclockwise: *Task status updated*\n*${title}* is now *${escapeSlack(formatSlackTaskStatus(task.status))}*.\nProject: ${projectName}\nAssignees: ${assigneeText}`;

  let sent = 0;
  let lastError: string | null = null;
  for (const [channelId, eventKey] of channels) {
    try { await sendSlackMessage(connection.access_token as string, channelId, textForEvent(eventKey)); sent += 1; } catch (error) { lastError = error instanceof Error ? error.message : "Slack message failed"; console.error("[projects] send Slack task notification:", error); }
  }
  if (sent === 0 && lastError) return NextResponse.json({ error: lastError }, { status: 502 });
  return NextResponse.json({ ok: true, sent });
}
