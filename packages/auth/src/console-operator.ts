import type { SupabaseClient } from "@supabase/supabase-js";

export function consoleAppSlug(): string {
  return process.env.NEXT_PUBLIC_CONSOLE_APP_SLUG || "console";
}

export function isConsoleAppSlug(appSlug: string): boolean {
  return appSlug === consoleAppSlug();
}

export function platformAppSlug(): string {
  return process.env.NEXT_PUBLIC_PLATFORM_APP_SLUG || "platform";
}

export function isPlatformAppSlug(appSlug: string): boolean {
  return appSlug === platformAppSlug();
}

/** Internal Kenoo surfaces — not product tiles in launchers or profile menus. */
export function isLauncherHiddenAppSlug(appSlug: string): boolean {
  return isConsoleAppSlug(appSlug) || isPlatformAppSlug(appSlug);
}

/**
 * True when the signed-in user is on the Console super-admin allowlist
 * (`public.console_operators` / `is_console_operator()`).
 */
export async function userIsConsoleOperator(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_console_operator");
  if (!error) {
    return data === true;
  }
  console.error("[auth] is_console_operator rpc:", error);

  const normalizedEmail = email?.trim().toLowerCase() || null;
  let query = supabase
    .from("console_operators")
    .select("id")
    .limit(1);

  if (normalizedEmail) {
    query = query.or(`user_id.eq.${userId},email.eq.${normalizedEmail}`);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data: row, error: tableError } = await query.maybeSingle();
  if (tableError) {
    console.error("[auth] console_operators lookup:", tableError);
    return false;
  }
  return !!row;
}
