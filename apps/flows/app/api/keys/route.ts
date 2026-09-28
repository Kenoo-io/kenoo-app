import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { FLOWS_EVENTS_WRITE_SCOPE, generateApiKey } from "@walls/supabase/api-keys";

import { canManageFlowsKeys, requireFlowsAccount } from "@/lib/api-key-auth";

export async function GET() {
  const auth = await requireFlowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_api_keys")
    .select("id, name, key_prefix, last_used_at, created_at, revoked_at, created_by, scopes")
    .eq("account_id", auth.accountId)
    .contains("scopes", [FLOWS_EVENTS_WRITE_SCOPE])
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load API keys" }, { status: 500 });

  return NextResponse.json({ keys: data ?? [], canManage: canManageFlowsKeys(auth.role) });
}

export async function POST(request: Request) {
  const auth = await requireFlowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canManageFlowsKeys(auth.role)) return NextResponse.json({ error: "Only workspace owners and admins can manage Flows API keys" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim() || "Flows event key";
  const generated = generateApiKey("knf_live_");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_api_keys")
    .insert({ account_id: auth.accountId, created_by: auth.userId, name, key_prefix: generated.prefix, key_hash: generated.hash, scopes: [FLOWS_EVENTS_WRITE_SCOPE] })
    .select("id, name, key_prefix, last_used_at, created_at, revoked_at, created_by, scopes")
    .single();
  if (error || !data) return NextResponse.json({ error: "Unable to create API key" }, { status: 500 });

  return NextResponse.json({ key: data, secret: generated.secret });
}
