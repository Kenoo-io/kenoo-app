import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";
import { resolveActiveAccountId } from "@/lib/account-context";
import { slackApi, SLACK_PROVIDER, SLACK_SERVICE } from "@/lib/slack";

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

  return NextResponse.json({
    connected: true,
    connection: {
      id: connection.id,
      teamId: connection.provider_account_id,
      teamName: (connection.token_payload as { team_name?: string } | null)?.team_name ?? null,
      createdAt: connection.created_at,
    },
    channels: [],
  });
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
