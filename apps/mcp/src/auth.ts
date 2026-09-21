import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type KenooIdentity = {
  accessToken: string;
  clientId: string | null;
  supabase: SupabaseClient;
  user: User;
};

export function getSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}

export function extractBearerToken(authorization?: string): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Creates a Supabase client scoped to the caller's access token. Never use the
 * service-role key in the MCP: the caller's RLS permissions are the boundary.
 */
export async function authenticateKenooUser(
  accessToken: string,
): Promise<KenooIdentity> {
  const { url, anonKey } = getSupabaseConfiguration();
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("The supplied access token is invalid or has expired.");
  }

  const claimsResult = await supabase.auth.getClaims(accessToken);
  if (claimsResult.error || !claimsResult.data) {
    throw new Error("The supplied access token could not be verified.");
  }

  const clientId = claimsResult.data.claims.client_id;
  return {
    accessToken,
    clientId: typeof clientId === "string" ? clientId : null,
    supabase,
    user: data.user,
  };
}
