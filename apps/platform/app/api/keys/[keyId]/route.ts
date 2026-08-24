import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";

import { requirePlatformManager } from "@/lib/account-context";

type RouteContext = { params: Promise<{ keyId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePlatformManager();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { keyId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_api_keys")
    .update({ name })
    .eq("id", keyId)
    .eq("account_id", auth.account.id)
    .select("id, name")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to rename key" },
      { status: 500 },
    );
  }

  return NextResponse.json({ key: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requirePlatformManager();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { keyId } = await context.params;
  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("account_id", auth.account.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
