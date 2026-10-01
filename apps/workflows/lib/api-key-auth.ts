import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";
import { extractBearerToken, WORKFLOWS_EVENTS_WRITE_SCOPE, hashApiKey } from "@walls/supabase/api-keys";

const WORKFLOWS_ACCOUNT_COOKIE = "workflows_account_id";

export async function requireWorkflowsAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };

  const cookieStore = await cookies();
  const accountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(WORKFLOWS_ACCOUNT_COOKIE)?.value ?? null;
  if (!accountId) return { error: "No active account" as const, status: 401 as const };

  const { data: membership } = await supabase
    .from("account_users")
    .select("account_id, role")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!membership) return { error: "No access to this account" as const, status: 403 as const };

  return { userId: user.id, accountId: membership.account_id as string, role: membership.role as string };
}

export function canManageWorkflowsKeys(role: string): boolean {
  return ["owner", "admin"].includes(role.toLowerCase());
}

export async function authenticateWorkflowsEventKey(request: Request) {
  const secret = extractBearerToken(request);
  if (!secret) return { error: "Missing Authorization Bearer token" as const, status: 401 as const };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_api_keys")
    .select("id, account_id, revoked_at, scopes")
    .eq("key_hash", hashApiKey(secret))
    .maybeSingle();

  if (error || !data || data.revoked_at || !(data.scopes as string[] | null)?.includes(WORKFLOWS_EVENTS_WRITE_SCOPE)) {
    return { error: "Invalid Workflows API key" as const, status: 401 as const };
  }

  await admin.from("platform_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { keyId: data.id as string, accountId: data.account_id as string };
}
