import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

const FLOWS_ACCOUNT_COOKIE = "flows_account_id";

async function getAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, accountId: null };
  const cookieStore = await cookies();
  const accountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(FLOWS_ACCOUNT_COOKIE)?.value ?? null;
  if (!accountId) return { supabase, accountId: null };
  const { data: membership } = await supabase.from("account_users").select("account_id").eq("user_id", user.id).eq("account_id", accountId).maybeSingle();
  return { supabase, accountId: membership?.account_id ?? null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { supabase, accountId } = await getAccountContext();
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });
  const { eventId } = await params;
  const body = (await request.json().catch(() => ({}))) as { key?: string; name?: string; description?: string | null; isActive?: boolean };
  const updates: Record<string, string | boolean | null> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.isActive !== undefined) updates.is_active = body.isActive;
  if (body.key !== undefined) {
    const key = body.key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(key)) return NextResponse.json({ error: "Key must use lowercase letters, numbers, and underscores" }, { status: 400 });
    updates.key = key;
  }
  if (typeof updates.name === "string" && !updates.name) return NextResponse.json({ error: "Event name is required" }, { status: 400 });

  const { data, error } = await supabase.from("flow_events").update(updates).eq("id", eventId).eq("account_id", accountId).select("id, key, name, description, payload_schema, is_active, created_at, updated_at").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "An event with this key already exists" }, { status: 409 });
    return NextResponse.json({ error: "Unable to update event" }, { status: 500 });
  }
  return NextResponse.json({ event: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { supabase, accountId } = await getAccountContext();
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });
  const { eventId } = await params;
  const { error } = await supabase.from("flow_events").delete().eq("id", eventId).eq("account_id", accountId);
  if (error) return NextResponse.json({ error: "Unable to delete event" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
