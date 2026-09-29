import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Task = {
  id: string;
  account_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | null;
  due_date: string;
  project_name: string;
};

type Rule = {
  id: string;
  account_id: string;
  channel_id: string;
  channel_name: string;
  project_ids: string[];
};

function escapeSlack(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

const OVERDUE_DELIVERY_HOUR_UTC = 15;
const OVERDUE_DELIVERY_WINDOW_MINUTES = 10;

function isDeliveryWindow(now: Date) {
  return now.getUTCHours() === OVERDUE_DELIVERY_HOUR_UTC && now.getUTCMinutes() < OVERDUE_DELIVERY_WINDOW_MINUTES;
}

async function postSlack(token: string, channel: string, text: string) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel, text }),
  });
  const result = await response.json() as { ok?: boolean; error?: string };
  if (!response.ok || !result.ok) throw new Error(result.error || "Slack message failed");
}

async function enqueueOverdue(tasks: Task[], rules: Rule[]) {
  const rows = [];
  for (const task of tasks) {
    for (const rule of rules) {
      if (rule.account_id !== task.account_id) continue;
      if (rule.project_ids.length > 0 && !rule.project_ids.includes(task.project_id)) continue;
      rows.push({ account_id: task.account_id, task_id: task.id, rule_id: rule.id, due_date: task.due_date });
    }
  }
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("project_slack_overdue_deliveries").upsert(rows, { onConflict: "task_id,rule_id,event_key,due_date", ignoreDuplicates: true });
  if (error) throw error;
  return rows.length;
}

async function processDeliveries() {
  const now = new Date().toISOString();
  const staleLock = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: deliveries, error } = await supabase
    .from("project_slack_overdue_deliveries")
      .select("id, account_id, task_id, rule_id, attempts, project_tasks!inner(title, description, status, priority, due_date, project_id, projects!inner(name)), project_slack_notification_rules!inner(project_slack_channels!inner(slack_channel_id))")
    .or(`and(status.eq.pending,next_attempt_at.lte.${now}),and(status.eq.failed,next_attempt_at.lte.${now}),and(status.eq.processing,locked_at.lt.${staleLock})`)
    .limit(100);
  if (error) throw error;
  let sent = 0;
  for (const delivery of deliveries ?? []) {
    const claimed = await supabase.from("project_slack_overdue_deliveries").update({ status: "processing", locked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", delivery.id).in("status", ["pending", "failed", "processing"]).select("id").maybeSingle();
    if (!claimed.data) continue;
    const task = Array.isArray(delivery.project_tasks) ? delivery.project_tasks[0] : delivery.project_tasks;
    const project = task && (Array.isArray(task.projects) ? task.projects[0] : task.projects);
    const rule = Array.isArray(delivery.project_slack_notification_rules) ? delivery.project_slack_notification_rules[0] : delivery.project_slack_notification_rules;
    const channel = rule && (Array.isArray(rule.project_slack_channels) ? rule.project_slack_channels[0] : rule.project_slack_channels);
    try {
      if (!task || task.status === "completed" || !channel?.slack_channel_id) throw new Error("Task is no longer eligible for an overdue notification");
      const { data: connection } = await supabase.from("account_connections").select("access_token").eq("account_id", delivery.account_id).eq("provider", "slack").eq("service", "workspace").is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!connection?.access_token) throw new Error("Slack connection is unavailable");
      const taskTitle = escapeSlack(String(task.title ?? "Untitled task"));
      const projectName = escapeSlack(String(project?.name ?? "Unknown Project"));
      const message = `:warning: *Task overdue*\n*${taskTitle}*\nProject: ${projectName}\nDeadline: ${escapeSlack(formatDate(String(task.due_date)))}\nPriority: ${escapeSlack(String(task.priority ?? "Not set"))}${task.description ? `\nDescription: ${escapeSlack(String(task.description).slice(0, 500))}` : ""}`;
      await postSlack(connection.access_token, channel.slack_channel_id, message);
      await supabase.from("project_slack_overdue_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), locked_at: null, updated_at: new Date().toISOString(), last_error: null }).eq("id", delivery.id);
      sent += 1;
    } catch (sendError) {
      const attempts = Number(delivery.attempts ?? 0) + 1;
      const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 5));
      await supabase.from("project_slack_overdue_deliveries").update({ status: "failed", attempts, next_attempt_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(), locked_at: null, last_error: sendError instanceof Error ? sendError.message : "Unknown Slack delivery error", updated_at: new Date().toISOString() }).eq("id", delivery.id);
    }
  }
  return sent;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  try {
    const now = new Date();
    let enqueued = 0;
    if (isDeliveryWindow(now)) {
      const utcDate = now.toISOString().slice(0, 10);
      const [{ data: taskRows, error: taskError }, { data: ruleRows, error: ruleError }] = await Promise.all([
        supabase.from("project_tasks").select("id, project_id, title, description, status, priority, due_date, projects!inner(name, account_id)").lt("due_date", utcDate).neq("status", "completed").limit(2000),
        supabase.from("project_slack_notification_rules").select("id, account_id, project_slack_channels!inner(slack_channel_id, slack_channel_name), project_slack_notification_rule_projects(project_id)").eq("enabled", true).limit(2000),
      ]);
      if (taskError) throw taskError;
      if (ruleError) throw ruleError;
      const tasks: Task[] = (taskRows ?? []).map((row: any) => { const project = Array.isArray(row.projects) ? row.projects[0] : row.projects; return { ...row, account_id: project.account_id, project_name: project.name }; });
      const rules: Rule[] = (ruleRows ?? []).map((row: any) => { const channel = Array.isArray(row.project_slack_channels) ? row.project_slack_channels[0] : row.project_slack_channels; return { id: row.id, account_id: row.account_id, channel_id: channel.slack_channel_id, channel_name: channel.slack_channel_name, project_ids: (row.project_slack_notification_rule_projects ?? []).map((item: any) => item.project_id) }; });
      enqueued = await enqueueOverdue(tasks, rules);
    }
    const sent = await processDeliveries();
    return new Response(JSON.stringify({ ok: true, enqueued, sent }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("project-slack-overdue", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Overdue Slack processing failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
