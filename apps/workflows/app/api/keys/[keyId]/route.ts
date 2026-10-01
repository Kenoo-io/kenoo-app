import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";

import { canManageWorkflowsKeys, requireWorkflowsAccount } from "@/lib/api-key-auth";

type RouteContext = { params: Promise<{ keyId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canManageWorkflowsKeys(auth.role)) return NextResponse.json({ error: "Only workspace owners and admins can manage Workflows API keys" }, { status: 403 });
  const { keyId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { data, error } = await createAdminClient().from("platform_api_keys").update({ name }).eq("id", keyId).eq("account_id", auth.accountId).contains("scopes", ["workflows:events:write"]).select("id, name").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Unable to rename API key" }, { status: 500 });
  return NextResponse.json({ key: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canManageWorkflowsKeys(auth.role)) return NextResponse.json({ error: "Only workspace owners and admins can manage Workflows API keys" }, { status: 403 });
  const { keyId } = await context.params;
  const { error } = await createAdminClient().from("platform_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", keyId).eq("account_id", auth.accountId).contains("scopes", ["workflows:events:write"]);
  if (error) return NextResponse.json({ error: "Unable to revoke API key" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
