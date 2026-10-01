import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";

import { authenticateWorkflowsEventKey } from "@/lib/api-key-auth";

const WORKFLOWS_ACCOUNT_COOKIE = "workflows_account_id";

async function getAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, accountId: null };

  const cookieStore = await cookies();
  const accountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(WORKFLOWS_ACCOUNT_COOKIE)?.value ?? null;
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

  const [{ data, error }, { data: presets, error: presetsError }] = await Promise.all([
    supabase
    .from("workflow_events")
    .select("id, key, name, description, payload_schema, is_active, created_at, updated_at")
    .eq("account_id", accountId)
    .order("name", { ascending: true }),
    supabase
      .from("workflow_event_presets")
      .select("id, key, name, description, category, payload_schema")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (error || presetsError) return NextResponse.json({ error: "Unable to load events" }, { status: 500 });
  return NextResponse.json({ events: data ?? [], presets: presets ?? [] });
}

export async function POST(request: Request) {
  const apiKeyAuth = request.headers.has("authorization")
    ? await authenticateWorkflowsEventKey(request)
    : null;
  if (apiKeyAuth && "error" in apiKeyAuth) {
    return NextResponse.json({ error: apiKeyAuth.error }, { status: apiKeyAuth.status });
  }

  const { supabase, accountId: sessionAccountId } = apiKeyAuth && !("error" in apiKeyAuth)
    ? { supabase: await createClient(), accountId: apiKeyAuth.accountId }
    : await getAccountContext();
  const accountId = apiKeyAuth && !("error" in apiKeyAuth) ? apiKeyAuth.accountId : sessionAccountId;
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });
  const database = apiKeyAuth && !("error" in apiKeyAuth) ? createAdminClient() : supabase;

  const body = (await request.json().catch(() => ({}))) as {
    key?: string;
    name?: string;
    description?: string;
    payloadSchema?: Record<string, unknown>;
    presetId?: string;
  };
  let key = body.key?.trim().toLowerCase();
  let name = body.name?.trim();
  let description = body.description?.trim() || null;
  let payloadSchema = body.payloadSchema ?? {};

  if (body.presetId) {
    const { data: preset, error: presetError } = await database
      .from("workflow_event_presets")
      .select("key, name, description, payload_schema")
      .eq("id", body.presetId)
      .eq("is_active", true)
      .maybeSingle();
    if (presetError || !preset) return NextResponse.json({ error: "Invalid event preset" }, { status: 400 });
    key = preset.key;
    name = preset.name;
    description = preset.description;
    payloadSchema = (preset.payload_schema as Record<string, unknown>) ?? {};
  }

  if (!key || !name) return NextResponse.json({ error: "Event name and key are required" }, { status: 400 });
  if (!/^[a-z][a-z0-9_]*$/.test(key)) {
    return NextResponse.json({ error: "Key must use lowercase letters, numbers, and underscores" }, { status: 400 });
  }

  const { data, error } = await database
    .from("workflow_events")
    .insert({
      account_id: accountId,
      key,
      name,
      description,
      payload_schema: payloadSchema,
    })
    .select("id, key, name, description, payload_schema, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "An event with this key already exists" }, { status: 409 });
    return NextResponse.json({ error: "Unable to create event" }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
