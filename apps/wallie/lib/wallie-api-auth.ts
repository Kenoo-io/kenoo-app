import type { User } from "@supabase/supabase-js";

import { createClient } from "@walls/supabase/server";

/** Supports portal cookie sessions (web) and Bearer tokens (mobile). */
export async function getWallieApiUser(
  request: Request,
): Promise<{ user: User | null; error?: string }> {
  const supabase = await createClient();
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (bearerToken) {
    const { data, error } = await supabase.auth.getUser(bearerToken);
    if (error) return { user: null, error: error.message };
    return { user: data.user };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return { user: null, error: error.message };
  return { user };
}
