import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";

import {
  requirePlatformAccount,
  requirePlatformManager,
} from "@/lib/account-context";
import { generateApiKey } from "@/lib/api-keys";

export async function GET() {
  const auth = await requirePlatformAccount();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_api_keys")
    .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
    .eq("account_id", auth.account.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requirePlatformManager();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim() || "Default key";
  const generated = generateApiKey();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_api_keys")
    .insert({
      account_id: auth.account.id,
      created_by: auth.userId,
      name,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create key" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    key: data,
    secret: generated.secret,
  });
}
