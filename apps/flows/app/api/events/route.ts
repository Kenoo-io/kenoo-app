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

  const { data: membership } = await supabase
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .maybeSingle();

  return { supabase, accountId: membership?.account_id ?? null };
}

export async function GET() {
  const { supabase, accountId } = await getAccountContext();
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });

  const { data, error } = await supabase
    .from("flow_events")
    .select("id, key, name, description, payload_schema, is_active, created_at, updated_at")
    .eq("account_id", accountId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: "Unable to load events" }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, accountId } = await getAccountContext();
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    key?: string;
    name?: string;
    description?: string;
    payloadSchema?: Record<string, unknown>;
  };
  const key = body.key?.trim().toLowerCase();
  const name = body.name?.trim();

  if (!key || !name) return NextResponse.json({ error: "Event name and key are required" }, { status: 400 });
  if (!/^[a-z][a-z0-9_]*$/.test(key)) {
    return NextResponse.json({ error: "Key must use lowercase letters, numbers, and underscores" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("flow_events")
    .insert({
      account_id: accountId,
      key,
      name,
      description: body.description?.trim() || null,
      payload_schema: body.payloadSchema ?? {},
    })
    .select("id, key, name, description, payload_schema, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "An event with this key already exists" }, { status: 409 });
    return NextResponse.json({ error: "Unable to create event" }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
