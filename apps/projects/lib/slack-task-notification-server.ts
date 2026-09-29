import { createAdminClient } from "@walls/supabase/admin";
import { sendSlackMessage, SLACK_PROVIDER, SLACK_SERVICE } from "@/lib/slack";

type EventKey = "task_created" | "task_assigned" | "task_status_changed";
type SpecificEventKey = "task_completed" | "task_blocked" | "task_unblocked";

function escapeSlack(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function displayName(user: { first_name?: string | null; last_name?: string | null; email?: string | null }) { return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email || "Unknown person"; }
function formatDate(value: string | null) {
  if (!value) return "No deadline";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export async function sendSlackTaskEventForAccount({ accountId, taskId, eventKey, specificEventKey, assigneeIds = [] }: { accountId: string; taskId: string; eventKey: EventKey; specificEventKey?: SpecificEventKey; assigneeIds?: string[] }) {
  const admin = createAdminClient();
  const [{ data: task }, { data: connection }] = await Promise.all([
    admin.from("project_tasks").select("id, project_id, title, description, status, priority, due_date, projects!inner(name, account_id)").eq("id", taskId).eq("projects.account_id", accountId).maybeSingle(),
    admin.from("account_connections").select("id, access_token").eq("account_id", accountId).eq("provider", SLACK_PROVIDER).eq("service", SLACK_SERVICE).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!task || !connection) return 0;
  const [{ data: assigneeRows }, { data: rules }, { data: mappingRows }] = await Promise.all([
    admin.from("project_task_assignees").select("user_id, user:users!project_task_assignees_user_id_fkey(id, first_name, last_name, email)").eq("task_id", task.id),
    admin.from("project_slack_notification_rules").select("id, project_slack_notification_rule_events(event_key), project_slack_notification_rule_projects(project_id), project_slack_channels!inner(slack_channel_id)").eq("account_id", accountId).eq("enabled", true),
    admin.from("slack_user_mappings").select("kenoo_user_id, slack_user_id").eq("account_id", accountId).eq("connection_id", connection.id).eq("active", true),
  ]);
  const assignees = (assigneeRows ?? []).map((row) => {
    const raw = row.user as unknown;
    const person = Array.isArray(raw) ? raw[0] : raw;
    return { id: row.user_id as string, name: person ? displayName(person as { first_name?: string | null; last_name?: string | null; email?: string | null }) : "Unknown person" };
  });
  const mappedSlackIds = new Map((mappingRows ?? []).map((mapping) => [mapping.kenoo_user_id as string, mapping.slack_user_id as string]));
  const selectedAssignees = eventKey === "task_assigned" && assigneeIds.length > 0 ? assignees.filter((assignee) => assigneeIds.includes(assignee.id)) : assignees;
  const assigneeText = selectedAssignees.length > 0 ? selectedAssignees.map((assignee) => mappedSlackIds.get(assignee.id) ? `<@${mappedSlackIds.get(assignee.id)}>` : `@${escapeSlack(assignee.name)}`).join(", ") : "Unassigned";
  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
  const channelEvents = new Map<string, Set<string>>();
  for (const rule of rules ?? []) {
    const projects = (rule.project_slack_notification_rule_projects ?? []) as Array<{ project_id: string }>;
    if (projects.length > 0 && !projects.some((item) => item.project_id === task.project_id)) continue;
    const channel = Array.isArray(rule.project_slack_channels) ? rule.project_slack_channels[0] : rule.project_slack_channels;
    if (!channel?.slack_channel_id) continue;
    const configured = channelEvents.get(channel.slack_channel_id) ?? new Set<string>();
    for (const event of (rule.project_slack_notification_rule_events ?? []) as Array<{ event_key: string }>) configured.add(event.event_key);
    channelEvents.set(channel.slack_channel_id, configured);
  }
  const channels = new Map<string, string>();
  for (const [channelId, configured] of channelEvents) {
    if (eventKey === "task_status_changed") {
      if (specificEventKey && configured.has(specificEventKey)) channels.set(channelId, specificEventKey);
      else if (configured.has("task_status_changed")) channels.set(channelId, "task_status_changed");
    } else if (configured.has(eventKey)) channels.set(channelId, eventKey);
  }
  if (channels.size === 0) return 0;
  const title = escapeSlack(String(task.title ?? "Untitled task"));
  const projectName = escapeSlack(String(project?.name ?? "Unknown Project"));
  const messageFor = (selectedEvent: string) => selectedEvent === "task_completed"
    ? `:white_check_mark: *Task completed*\n*${title}*\nProject: ${projectName}\nCompleted with assignees: ${assigneeText}`
    : selectedEvent === "task_blocked"
      ? `:no_entry_sign: *Task blocked*\n*${title}*\nProject: ${projectName}\nAssignees: ${assigneeText}`
      : selectedEvent === "task_unblocked"
        ? `:large_green_circle: *Task unblocked*\n*${title}*\nProject: ${projectName}\nAssignees: ${assigneeText}`
        : `:arrows_counterclockwise: *Task status updated*\n*${title}* is now *${escapeSlack(String(task.status ?? "Unknown"))}*.\nProject: ${projectName}\nDeadline: ${escapeSlack(formatDate(task.due_date as string | null))}\nAssignees: ${assigneeText}`;
  let sent = 0;
  for (const [channelId, selectedEvent] of channels) {
    try { await sendSlackMessage(connection.access_token as string, channelId, messageFor(selectedEvent)); sent += 1; } catch (error) { console.error("[projects] send Slack task notification:", error); }
  }
  return sent;
}
