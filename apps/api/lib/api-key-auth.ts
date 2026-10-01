import { createAdminClient } from "@walls/supabase/admin";
import {
  extractBearerToken,
  WORKFLOWS_EVENTS_WRITE_SCOPE,
  hashApiKey,
} from "@walls/supabase/api-keys";

export async function authenticateEventKey(request: Request) {
  const secret = extractBearerToken(request);
  if (!secret) {
    return { error: "Missing Authorization Bearer token", status: 401 as const };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_api_keys")
    .select("id, account_id, revoked_at, scopes")
    .eq("key_hash", hashApiKey(secret))
    .maybeSingle();

  if (
    error ||
    !data ||
    data.revoked_at ||
    !(data.scopes as string[] | null)?.includes(WORKFLOWS_EVENTS_WRITE_SCOPE)
  ) {
    return { error: "Invalid event API key", status: 401 as const };
  }

  await admin
    .from("platform_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    admin,
    keyId: data.id as string,
    accountId: data.account_id as string,
  };
}
