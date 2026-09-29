import { createAdminClient } from "@walls/supabase/admin";
import { formatSlackTaskStatus, sendSlackMessage, SLACK_PROVIDER, SLACK_SERVICE } from "@/lib/slack";

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
  const [{ data: assigneeRows }, { data: rules, error: rulesError }, { data: mappingRows }] = await Promise.all([
    admin.from("project_task_assignees").select("user_id, user:users!project_task_assignees_user_id_fkey(id, first_name, last_name, email)").eq("task_id", task.id),
    admin.from("project_slack_notification_rules").select("id, channel_id").eq("account_id", accountId).eq("enabled", true),
    admin.from("slack_user_mappings").select("kenoo_user_id, slack_user_id").eq("account_id", accountId).eq("connection_id", connection.id).eq("active", true),
  ]);
  if (rulesError) throw rulesError;
  const ruleIds = (rules ?? []).map((rule) => rule.id as string);
  const channelIds = [...new Set((rules ?? []).map((rule) => rule.channel_id as string))];
  const [{ data: channelRows, error: channelError }, { data: eventRows, error: eventsError }, { data: projectRows, error: projectsError }] = await Promise.all([
    channelIds.length > 0 ? admin.from("project_slack_channels").select("id, slack_channel_id").in("id", channelIds) : Promise.resolve({ data: [], error: null }),
    ruleIds.length > 0 ? admin.from("project_slack_notification_rule_events").select("rule_id, event_key").in("rule_id", ruleIds) : Promise.resolve({ data: [], error: null }),
    ruleIds.length > 0 ? admin.from("project_slack_notification_rule_projects").select("rule_id, project_id").in("rule_id", ruleIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (channelError || eventsError || projectsError) throw channelError ?? eventsError ?? projectsError;
  const channelById = new Map((channelRows ?? []).map((channel) => [channel.id as string, channel.slack_channel_id as string]));
  const eventsByRule = new Map<string, Set<string>>();
  for (const row of (eventRows ?? []) as Array<{ rule_id: string; event_key: string }>) eventsByRule.set(row.rule_id, new Set([...(eventsByRule.get(row.rule_id) ?? []), row.event_key]));
  const projectsByRule = new Map<string, Set<string>>();
  for (const row of (projectRows ?? []) as Array<{ rule_id: string; project_id: string }>) projectsByRule.set(row.rule_id, new Set([...(projectsByRule.get(row.rule_id) ?? []), row.project_id]));
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
    const projects = projectsByRule.get(rule.id as string) ?? new Set<string>();
    if (projects.size > 0 && !projects.has(task.project_id as string)) continue;
    const slackChannelId = channelById.get(rule.channel_id as string);
    if (!slackChannelId) continue;
    const configured = channelEvents.get(slackChannelId) ?? new Set<string>();
    for (const eventKey of eventsByRule.get(rule.id as string) ?? []) configured.add(eventKey);
    channelEvents.set(slackChannelId, configured);
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
        : `:arrows_counterclockwise: *Task status updated*\n*${title}* is now *${escapeSlack(formatSlackTaskStatus(task.status))}*.\nProject: ${projectName}\nDeadline: ${escapeSlack(formatDate(task.due_date as string | null))}\nAssignees: ${assigneeText}`;
  let sent = 0;
  let lastError: unknown;
  for (const [channelId, selectedEvent] of channels) {
    try {
      await sendSlackMessage(connection.access_token as string, channelId, messageFor(selectedEvent));
      sent += 1;
    } catch (error) {
      lastError = error;
      console.error("[projects] send Slack task notification:", error);
    }
  }
  if (sent === 0 && channels.size > 0) {
    throw lastError instanceof Error ? lastError : new Error("Slack rejected the notification");
  }
  return sent;
}
