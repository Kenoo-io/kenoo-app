import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";
import { resolveActiveAccountId } from "@/lib/account-context";
import { listSlackChannels, slackApi, SLACK_PROVIDER, SLACK_SERVICE } from "@/lib/slack";

async function getAccount() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { user: null, accountId: null };
  return { user, accountId: await resolveActiveAccountId(user.id) };
}

export async function GET() {
  const { user, accountId } = await getAccount();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });

  const admin = createAdminClient();
  const { data: connection, error: connectionError } = await admin
    .from("account_connections")
    .select("id, provider_account_id, token_payload, created_at")
    .eq("account_id", accountId)
    .eq("provider", SLACK_PROVIDER)
    .eq("service", SLACK_SERVICE)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (connectionError) {
    console.error("[projects] load Slack connection:", connectionError);
    return NextResponse.json({ error: "Unable to load Slack connection", detail: connectionError.message }, { status: 500 });
  }
  if (!connection) return NextResponse.json({ connected: false, channels: [] });

  const { data: selected, error: selectedError } = await admin
    .from("project_slack_channels")
    .select("id, slack_channel_id, slack_channel_name, is_private, enabled, event_task_completed")
    .eq("account_id", accountId)
    .eq("connection_id", connection.id)
    .order("slack_channel_name");
  if (selectedError) {
    console.error("[projects] load selected Slack channels:", selectedError);
    return NextResponse.json({ error: "Unable to load Slack channels", detail: selectedError.message }, { status: 500 });
  }

  const selectedIds = (selected ?? []).map((row) => row.id as string);
  const [{ data: eventRows }, { data: projectRows }, { data: projects }] = await Promise.all([
    selectedIds.length > 0
      ? admin.from("project_slack_channel_events").select("channel_id, event_key, enabled").in("channel_id", selectedIds)
      : Promise.resolve({ data: [] as unknown[] }),
    selectedIds.length > 0
      ? admin.from("project_slack_channel_projects").select("channel_id, project_id").in("channel_id", selectedIds)
      : Promise.resolve({ data: [] as unknown[] }),
    admin.from("projects").select("id, name").eq("account_id", accountId).order("name"),
  ]);
  const eventsByChannel = new Map<string, string[]>();
  for (const row of (eventRows ?? []) as Array<{ channel_id: string; event_key: string; enabled: boolean }>) {
    if (row.enabled === false) continue;
    const current = eventsByChannel.get(row.channel_id as string) ?? [];
    current.push(row.event_key as string);
    eventsByChannel.set(row.channel_id as string, current);
  }
  const projectsByChannel = new Map<string, string[]>();
  for (const row of (projectRows ?? []) as Array<{ channel_id: string; project_id: string }>) {
    const current = projectsByChannel.get(row.channel_id as string) ?? [];
    current.push(row.project_id as string);
    projectsByChannel.set(row.channel_id as string, current);
  }

  let channels: unknown[] = [];
  try {
    const { data: tokenRow } = await admin.from("account_connections").select("access_token").eq("id", connection.id).single();
    channels = await listSlackChannels(tokenRow?.access_token as string);
  } catch (error) {
    console.error("[projects] list Slack channels:", error);
  }

  return NextResponse.json({
    connected: true,
    connection: {
      id: connection.id,
      teamId: connection.provider_account_id,
      teamName: (connection.token_payload as { team_name?: string } | null)?.team_name ?? null,
      createdAt: connection.created_at,
    },
    channels,
    selected: (selected ?? []).map((row) => ({
      ...row,
      events: eventsByChannel.get(row.id as string) ?? (row.event_task_completed ? ["task_completed"] : []),
      projectIds: projectsByChannel.get(row.id as string) ?? [],
    })),
    projects: projects ?? [],
  });
}

export async function PUT(request: Request) {
  const { user, accountId } = await getAccount();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; channelId?: unknown; channelName?: unknown; isPrivate?: unknown; enabled?: unknown; eventTaskCompleted?: unknown; eventKeys?: unknown; projectIds?: unknown };
  const action = body.action === "events" || body.action === "projects" ? body.action : "channel";
  if ((action === "events" || action === "projects") && typeof body.channelId !== "string") return NextResponse.json({ error: "A Slack channel is required" }, { status: 400 });

  if (action === "events" || action === "projects") {
    const admin = createAdminClient();
    const { data: channel } = await admin.from("project_slack_channels").select("id").eq("id", body.channelId).eq("account_id", accountId).maybeSingle();
    if (!channel) return NextResponse.json({ error: "Slack channel is not configured for this account" }, { status: 404 });

    if (action === "events") {
      const eventKeys = Array.isArray(body.eventKeys) ? body.eventKeys.filter((value): value is string => typeof value === "string") : [];
      const { error: deleteError } = await admin.from("project_slack_channel_events").delete().eq("channel_id", channel.id);
      if (deleteError) return NextResponse.json({ error: "Unable to save Slack events" }, { status: 500 });
      if (eventKeys.length > 0) {
        const { error: insertError } = await admin.from("project_slack_channel_events").insert(eventKeys.map((eventKey) => ({ channel_id: channel.id, event_key: eventKey, enabled: true })));
        if (insertError) return NextResponse.json({ error: "Unable to save Slack events" }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const projectIds = Array.isArray(body.projectIds) ? body.projectIds.filter((value): value is string => typeof value === "string") : [];
    if (projectIds.length > 0) {
      const { data: validProjects } = await admin.from("projects").select("id").eq("account_id", accountId).in("id", projectIds);
      if ((validProjects ?? []).length !== projectIds.length) return NextResponse.json({ error: "One or more Projects are invalid" }, { status: 400 });
    }
    const { error: deleteError } = await admin.from("project_slack_channel_projects").delete().eq("channel_id", channel.id);
    if (deleteError) return NextResponse.json({ error: "Unable to save Slack project routing" }, { status: 500 });
    if (projectIds.length > 0) {
      const { error: insertError } = await admin.from("project_slack_channel_projects").insert(projectIds.map((projectId) => ({ account_id: accountId, channel_id: channel.id, project_id: projectId })));
      if (insertError) return NextResponse.json({ error: "Unable to save Slack project routing" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof body.channelId !== "string" || typeof body.channelName !== "string") return NextResponse.json({ error: "A Slack channel is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: connection } = await admin.from("account_connections").select("id").eq("account_id", accountId).eq("provider", SLACK_PROVIDER).eq("service", SLACK_SERVICE).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!connection) return NextResponse.json({ error: "Slack is not connected" }, { status: 404 });
  const { error } = await admin.from("project_slack_channels").upsert({
    account_id: accountId,
    connection_id: connection.id,
    slack_channel_id: body.channelId,
    slack_channel_name: body.channelName,
    is_private: body.isPrivate === true,
    enabled: body.enabled !== false,
    event_task_completed: body.eventTaskCompleted !== false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "connection_id,slack_channel_id" });
  if (error) return NextResponse.json({ error: "Unable to save Slack channel" }, { status: 500 });
  const { data: savedChannel } = await admin.from("project_slack_channels").select("id").eq("account_id", accountId).eq("connection_id", connection.id).eq("slack_channel_id", body.channelId).maybeSingle();
  if (savedChannel && body.enabled !== false) {
    await admin.from("project_slack_channel_events").upsert({ channel_id: savedChannel.id, event_key: "task_completed", enabled: true, updated_at: new Date().toISOString() }, { onConflict: "channel_id,event_key" });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { user, accountId } = await getAccount();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });
  const admin = createAdminClient();
  const { data: connection } = await admin.from("account_connections").select("id, access_token").eq("account_id", accountId).eq("provider", SLACK_PROVIDER).eq("service", SLACK_SERVICE).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!connection) return NextResponse.json({ ok: true });

  try {
    await slackApi<{ ok: boolean; revoked?: boolean }>(connection.access_token as string, "auth.revoke");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke Slack access";
    if (!message.includes("invalid_auth") && !message.includes("token_revoked") && !message.includes("account_inactive")) {
      console.error("[projects] revoke Slack token:", error);
      return NextResponse.json({ error: "Unable to disconnect Slack from the workspace" }, { status: 502 });
    }
  }
  const { error } = await admin.from("account_connections").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", connection.id);
  if (error) return NextResponse.json({ error: "Unable to disconnect Slack" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
