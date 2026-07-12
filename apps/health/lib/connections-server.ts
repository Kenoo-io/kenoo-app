import { createClient } from "@walls/supabase/server";

import {
  STRAVA_PROVIDER,
  STRAVA_SERVICE,
  type SafeUserConnection,
} from "@/lib/connections";

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listSafeConnectionsForUser(
  userId: string,
): Promise<SafeUserConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_connections")
    .select(
      "id, provider, service, account_id, token_expiry, revoked_at, created_at, updated_at, token_payload",
    )
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[health] list connections:", error);
    return [];
  }

  return (data ?? []) as SafeUserConnection[];
}

export async function listStravaConnections(
  userId: string,
): Promise<SafeUserConnection[]> {
  const connections = await listSafeConnectionsForUser(userId);
  return connections.filter(
    (c) => c.provider === STRAVA_PROVIDER && c.service === STRAVA_SERVICE,
  );
}
