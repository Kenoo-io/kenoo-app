import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";
import { resolveActiveAccountId } from "@/lib/account-context";
import { listSlackUsers, SLACK_PROVIDER, SLACK_SERVICE } from "@/lib/slack";

const SLACK_USER_CACHE_TTL_MS = 60 * 60 * 1000;

function displayName(user: { first_name?: string | null; last_name?: string | null; email?: string | null }) {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email || "Unnamed user";
}

async function getContext() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  return { user, accountId: user ? await resolveActiveAccountId(user.id) : null };
}

export async function GET() {
  const { user, accountId } = await getContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("account_connections")
    .select("id, provider_account_id, token_payload, access_token")
    .eq("account_id", accountId)
    .eq("provider", SLACK_PROVIDER)
    .eq("service", SLACK_SERVICE)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!connection) return NextResponse.json({ connected: false, users: [], slackUsers: [] });

  const { data: cachedSlackUsers } = await admin
    .from("slack_workspace_users")
    .select("slack_user_id, slack_email, slack_display_name, active, synced_at")
    .eq("account_id", accountId)
    .eq("connection_id", connection.id)
    .eq("active", true)
    .order("synced_at", { ascending: false });
  const latestSync = cachedSlackUsers?.[0]?.synced_at ? Date.parse(cachedSlackUsers[0].synced_at as string) : 0;
  let slackUsers = (cachedSlackUsers ?? []).map((cachedUser) => ({ id: cachedUser.slack_user_id as string, profile: { email: cachedUser.slack_email as string | undefined, display_name: cachedUser.slack_display_name as string } }));
  if (!latestSync || Date.now() - latestSync > SLACK_USER_CACHE_TTL_MS) {
    try {
      const freshSlackUsers = await listSlackUsers(connection.access_token as string);
      const syncedAt = new Date().toISOString();
      await admin.from("slack_workspace_users").update({ active: false, synced_at: syncedAt, updated_at: syncedAt }).eq("account_id", accountId).eq("connection_id", connection.id);
      if (freshSlackUsers.length > 0) {
        const { error: cacheError } = await admin.from("slack_workspace_users").upsert(freshSlackUsers.map((slackUser) => ({ account_id: accountId, connection_id: connection.id, slack_user_id: slackUser.id, slack_email: slackUser.profile?.email ?? null, slack_display_name: slackUser.profile?.display_name || slackUser.profile?.real_name || slackUser.real_name || slackUser.name || slackUser.id, active: true, synced_at: syncedAt, updated_at: syncedAt })), { onConflict: "connection_id,slack_user_id" });
        if (cacheError) throw cacheError;
      }
      slackUsers = freshSlackUsers.map((slackUser) => ({
        id: slackUser.id,
        profile: {
          email: slackUser.profile?.email,
          display_name: slackUser.profile?.display_name || slackUser.profile?.real_name || slackUser.real_name || slackUser.name || slackUser.id,
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to list Slack users";
      const needsReconnect = message.includes("missing_scope") || message.includes("not_allowed_token_type");
      if (slackUsers.length === 0) return NextResponse.json({ error: needsReconnect ? "Reconnect Slack to enable user mapping" : message, code: needsReconnect ? "slack_reconnect_required" : "slack_users_unavailable" }, { status: 400 });
    }
  }

  const { data: memberships, error: membershipError } = await admin.from("account_users").select("user_id").eq("account_id", accountId).not("user_id", "is", null);
  if (membershipError) return NextResponse.json({ error: "Unable to load Projects users" }, { status: 500 });
  const userIds = (memberships ?? []).map((row) => row.user_id as string).filter(Boolean);
  const { data: kenooUsers, error: usersError } = userIds.length > 0
    ? await admin.from("users").select("id, first_name, last_name, email").in("id", userIds).order("first_name")
    : { data: [], error: null };
  if (usersError) return NextResponse.json({ error: "Unable to load Projects users" }, { status: 500 });

  const { data: mappings, error: mappingsError } = await admin
    .from("slack_user_mappings")
    .select("kenoo_user_id, slack_user_id, slack_email, slack_display_name, active")
    .eq("account_id", accountId)
    .eq("connection_id", connection.id);
  if (mappingsError) return NextResponse.json({ error: "Unable to load Slack mappings" }, { status: 500 });

  const byEmail = new Map(slackUsers.map((slackUser) => [slackUser.profile?.email?.toLowerCase() ?? "", slackUser.id]));
  const mappedByUser = new Map((mappings ?? []).map((mapping) => [mapping.kenoo_user_id as string, mapping]));
  return NextResponse.json({
    connected: true,
    connection: { id: connection.id, teamId: connection.provider_account_id, teamName: (connection.token_payload as { team_name?: string } | null)?.team_name ?? null },
    slackUsers: slackUsers.map((slackUser) => ({ id: slackUser.id, name: slackUser.profile?.display_name || slackUser.id, email: slackUser.profile?.email ?? null })),
    users: (kenooUsers ?? []).map((kenooUser) => {
      const mapping = mappedByUser.get(kenooUser.id as string);
      return { id: kenooUser.id, name: displayName(kenooUser), email: kenooUser.email, slackUserId: mapping?.slack_user_id ?? null, suggestedSlackUserId: mapping?.slack_user_id ?? (kenooUser.email ? byEmail.get(kenooUser.email.toLowerCase()) ?? null : null) };
    }),
  });
}

export async function PUT(request: Request) {
  const { user, accountId } = await getContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 400 });
  const body = await request.json().catch(() => ({})) as { kenooUserId?: unknown; slackUserId?: unknown };
  if (typeof body.kenooUserId !== "string") return NextResponse.json({ error: "A Projects user is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: connection } = await admin.from("account_connections").select("id, access_token").eq("account_id", accountId).eq("provider", SLACK_PROVIDER).eq("service", SLACK_SERVICE).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!connection) return NextResponse.json({ error: "Slack is not connected" }, { status: 404 });
  const { data: membership } = await admin.from("account_users").select("user_id").eq("account_id", accountId).eq("user_id", body.kenooUserId).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Projects user is not in this account" }, { status: 400 });

  if (body.slackUserId === null || body.slackUserId === "") {
    const { error } = await admin.from("slack_user_mappings").delete().eq("account_id", accountId).eq("connection_id", connection.id).eq("kenoo_user_id", body.kenooUserId);
    if (error) return NextResponse.json({ error: "Unable to remove Slack mapping" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (typeof body.slackUserId !== "string") return NextResponse.json({ error: "A Slack user is required" }, { status: 400 });
  const { data: profile } = await admin.from("users").select("email").eq("id", body.kenooUserId).single();
  const { data: cachedSlackUser } = await admin.from("slack_workspace_users").select("slack_user_id, slack_email, slack_display_name").eq("account_id", accountId).eq("connection_id", connection.id).eq("slack_user_id", body.slackUserId).eq("active", true).maybeSingle();
  if (!cachedSlackUser) return NextResponse.json({ error: "Refresh the Slack user list before creating this mapping" }, { status: 400 });
  const { error } = await admin.from("slack_user_mappings").upsert({ account_id: accountId, connection_id: connection.id, kenoo_user_id: body.kenooUserId, slack_user_id: cachedSlackUser.slack_user_id, slack_email: cachedSlackUser.slack_email, slack_display_name: cachedSlackUser.slack_display_name, active: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "connection_id,kenoo_user_id" });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That Slack user is already mapped to another Projects user" : "Unable to save Slack mapping" }, { status: 500 });
  return NextResponse.json({ ok: true, email: profile?.email ?? null });
}
