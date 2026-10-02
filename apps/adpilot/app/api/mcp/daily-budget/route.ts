import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSupabaseEnv } from "@walls/supabase/env";
import { updateEntityDailyBudget } from "@/lib/entity-budget-server";

function bearerToken(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

/**
 * Authenticated bridge used only by the public Kenoo MCP. It deliberately
 * performs the same selected-account and AdPilot-access checks as the other
 * MCP write endpoint before a provider budget is changed.
 */
export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const [{ data: userData, error: userError }, claimsResult] = await Promise.all([
    supabase.auth.getUser(token),
    supabase.auth.getClaims(token),
  ]);
  const clientId = claimsResult.data?.claims?.client_id;
  if (userError || !userData.user || claimsResult.error || typeof clientId !== "string") {
    return NextResponse.json({ error: "Invalid MCP authorization" }, { status: 401 });
  }

  const { data: authorization, error: authorizationError } = await supabase
    .from("account_authorizations")
    .select("account_id")
    .eq("user_id", userData.user.id)
    .eq("authorization_server", "supabase")
    .eq("client_id", clientId)
    .eq("resource", "mcp")
    .is("revoked_at", null)
    .maybeSingle();
  if (authorizationError || !authorization?.account_id) {
    return NextResponse.json({ error: "This MCP connection has no selected account" }, { status: 403 });
  }

  const accountId = authorization.account_id as string;
  const { data: app, error: appError } = await supabase
    .from("apps")
    .select("id")
    .eq("slug", "adpilot")
    .eq("is_active", true)
    .maybeSingle();
  if (appError || !app) return NextResponse.json({ error: "AdPilot is unavailable" }, { status: 403 });

  const [{ data: userGrant, error: userGrantError }, { data: accountGrant, error: accountGrantError }] = await Promise.all([
    supabase.from("account_app_user_access").select("id").eq("account_id", accountId).eq("user_id", userData.user.id).eq("app_id", app.id).maybeSingle(),
    supabase.from("account_app_access").select("id").eq("account_id", accountId).eq("app_id", app.id).maybeSingle(),
  ]);
  if (userGrantError || accountGrantError) return NextResponse.json({ error: "Unable to verify AdPilot access" }, { status: 403 });

  if (!userGrant && !accountGrant) {
    const { data: anyAccountGrant, error: anyGrantError } = await supabase
      .from("account_app_user_access")
      .select("id")
      .eq("user_id", userData.user.id)
      .limit(1);
    if (anyGrantError) return NextResponse.json({ error: "Unable to verify AdPilot access" }, { status: 403 });
    if ((anyAccountGrant ?? []).length) return NextResponse.json({ error: "The selected account does not have access to AdPilot" }, { status: 403 });
    const { data: legacyGrant, error: legacyError } = await supabase
      .from("user_app_access")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("app_id", app.id)
      .maybeSingle();
    if (legacyError || !legacyGrant) return NextResponse.json({ error: "The selected account does not have access to AdPilot" }, { status: 403 });
  }

  let body: { entityId?: string; dailyBudgetMicros?: number };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const dailyBudgetMicros = Number(body.dailyBudgetMicros);
  if (!body.entityId || !Number.isFinite(dailyBudgetMicros) || dailyBudgetMicros <= 0) {
    return NextResponse.json({ error: "entityId and a positive dailyBudgetMicros are required" }, { status: 400 });
  }

  try {
    const result = await updateEntityDailyBudget({
      scope: { accountId, userId: userData.user.id },
      entityId: body.entityId,
      dailyBudgetMicros,
      userClient: supabase,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update daily budget";
    const status = message === "Entity not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
