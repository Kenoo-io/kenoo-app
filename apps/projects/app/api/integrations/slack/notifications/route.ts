import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";
import { resolveActiveAccountId } from "@/lib/account-context";
import { listSlackChannels, SLACK_PROVIDER, SLACK_SERVICE } from "@/lib/slack";

const EVENT_KEYS = new Set(["task_created", "task_assigned", "task_status_changed", "task_completed", "task_blocked", "task_unblocked", "task_overdue"]);

async function getAccount() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  return { user, accountId: user ? await resolveActiveAccountId(user.id) : null };
}

async function getConnection(accountId: string) {
  const admin = createAdminClient();
  return admin.from("account_connections").select("id, provider_account_id, token_payload, created_at, access_token").eq("account_id", accountId).eq("provider", SLACK_PROVIDER).eq("service", SLACK_SERVICE).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
}

function cleanIds(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))] : [];
}

async function validInput(accountId: string, body: Record<string, unknown>) {
  const channelId = typeof body.channelId === "string" ? body.channelId : "";
  const channelName = typeof body.channelName === "string" ? body.channelName : "";
  const eventKeys = cleanIds(body.eventKeys).filter((key) => EVENT_KEYS.has(key));
  const projectIds = cleanIds(body.projectIds);
  if (!channelId || !channelName || eventKeys.length === 0) throw new Error("Choose a Slack channel and at least one event");
  const admin = createAdminClient();
  const { data: projects } = projectIds.length > 0 ? await admin.from("projects").select("id").eq("account_id", accountId).in("id", projectIds) : { data: [] };
  if (projects && projects.length !== projectIds.length) throw new Error("One or more Projects are invalid");
  return { channelId, channelName, eventKeys, projectIds, isPrivate: body.isPrivate === true };
}

export async function GET() {
  const { user, accountId } = await getAccount();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });
  const admin = createAdminClient();
  const { data: connection } = await getConnection(accountId);
  if (!connection) return NextResponse.json({ connected: false, channels: [], projects: [], rules: [] });

  let channels: unknown[] = [];
  try { channels = await listSlackChannels(connection.access_token as string); } catch (error) { console.error("[projects] list Slack channels:", error); }
  const [{ data: projects, error: projectsError }, { data: rules, error: rulesError }] = await Promise.all([
    admin.from("projects").select("id, name").eq("account_id", accountId).order("name"),
    admin.from("project_slack_notification_rules").select("id, channel_id, enabled, created_at, updated_at").eq("account_id", accountId).order("created_at", { ascending: false }),
  ]);
  if (projectsError || rulesError) {
    console.error("[projects] load Slack notification rules:", projectsError ?? rulesError);
    return NextResponse.json({ error: "Unable to load Slack notification rules", detail: (projectsError ?? rulesError)?.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const ruleIds = (rules ?? []).map((rule) => rule.id as string);
  const channelIds = [...new Set((rules ?? []).map((rule) => rule.channel_id as string))];
  const [{ data: channelRows }, { data: eventRows, error: eventsError }, { data: projectRows, error: ruleProjectsError }] = await Promise.all([
    channelIds.length > 0 ? admin.from("project_slack_channels").select("id, slack_channel_id, slack_channel_name, is_private").in("id", channelIds) : Promise.resolve({ data: [], error: null }),
    ruleIds.length > 0 ? admin.from("project_slack_notification_rule_events").select("rule_id, event_key").in("rule_id", ruleIds) : Promise.resolve({ data: [], error: null }),
    ruleIds.length > 0 ? admin.from("project_slack_notification_rule_projects").select("rule_id, project_id").in("rule_id", ruleIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (eventsError || ruleProjectsError) {
    console.error("[projects] load Slack notification rule details:", eventsError ?? ruleProjectsError);
    return NextResponse.json({ error: "Unable to load Slack notification details", detail: (eventsError ?? ruleProjectsError)?.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const channelsById = new Map((channelRows ?? []).map((channel) => [channel.id as string, channel]));
  const eventsByRule = new Map<string, string[]>();
  for (const row of (eventRows ?? []) as Array<{ rule_id: string; event_key: string }>) eventsByRule.set(row.rule_id, [...(eventsByRule.get(row.rule_id) ?? []), row.event_key]);
  const projectsByRule = new Map<string, string[]>();
  for (const row of (projectRows ?? []) as Array<{ rule_id: string; project_id: string }>) projectsByRule.set(row.rule_id, [...(projectsByRule.get(row.rule_id) ?? []), row.project_id]);
  return NextResponse.json({
    connected: true,
    connection: { teamName: (connection.token_payload as { team_name?: string } | null)?.team_name ?? null },
    channels,
    projects: projects ?? [],
    rules: (rules ?? []).map((rule) => {
      const channel = channelsById.get(rule.channel_id as string);
      return { id: rule.id, enabled: rule.enabled, createdAt: rule.created_at, channelId: channel?.slack_channel_id, channelName: channel?.slack_channel_name, isPrivate: channel?.is_private, eventKeys: eventsByRule.get(rule.id as string) ?? [], projectIds: projectsByRule.get(rule.id as string) ?? [] };
    }),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

async function saveRule(accountId: string, body: Record<string, unknown>, id?: string) {
  const input = await validInput(accountId, body);
  const admin = createAdminClient();
  const { data: connection } = await getConnection(accountId);
  if (!connection) throw new Error("Slack is not connected");
  const { data: channel, error: channelError } = await admin.from("project_slack_channels").upsert({ account_id: accountId, connection_id: connection.id, slack_channel_id: input.channelId, slack_channel_name: input.channelName, is_private: input.isPrivate, enabled: true, updated_at: new Date().toISOString() }, { onConflict: "connection_id,slack_channel_id" }).select("id").single();
  if (channelError || !channel) throw new Error("Unable to save Slack channel");
  let ruleId = id;
  if (id) {
    const { data: owned } = await admin.from("project_slack_notification_rules").select("id").eq("id", id).eq("account_id", accountId).maybeSingle();
    if (!owned) throw new Error("Notification rule not found");
    await admin.from("project_slack_notification_rule_events").delete().eq("rule_id", id);
    await admin.from("project_slack_notification_rule_projects").delete().eq("rule_id", id);
    const { error } = await admin.from("project_slack_notification_rules").update({ channel_id: channel.id, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error("Unable to update notification rule");
  } else {
    const { data: created, error } = await admin.from("project_slack_notification_rules").insert({ account_id: accountId, channel_id: channel.id }).select("id").single();
    if (error || !created) throw new Error("Unable to create notification rule");
    ruleId = created.id;
  }
  const { error: eventsError } = await admin.from("project_slack_notification_rule_events").insert(input.eventKeys.map((eventKey) => ({ rule_id: ruleId, event_key: eventKey })));
  if (eventsError) throw new Error("Unable to save notification events");
  if (input.projectIds.length > 0) {
    const { error: projectsError } = await admin.from("project_slack_notification_rule_projects").insert(input.projectIds.map((projectId) => ({ rule_id: ruleId, project_id: projectId })));
    if (projectsError) throw new Error("Unable to save notification projects");
  }
  return ruleId;
}

export async function POST(request: Request) {
  const { user, accountId } = await getAccount();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });
  try { const id = await saveRule(accountId, await request.json()); return NextResponse.json({ ok: true, id }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create notification" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  const { user, accountId } = await getAccount();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });
  try { const body = await request.json() as Record<string, unknown>; if (typeof body.id !== "string") throw new Error("Notification rule is required"); await saveRule(accountId, body, body.id); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update notification" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const { user, accountId } = await getAccount();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Notification rule is required" }, { status: 400 });
  const { error } = await createAdminClient().from("project_slack_notification_rules").delete().eq("id", id).eq("account_id", accountId);
  if (error) return NextResponse.json({ error: "Unable to delete notification" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
