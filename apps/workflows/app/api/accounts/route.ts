import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ACTIVE_ACCOUNT_COOKIE, getActiveAccountCookieOptions, getAccountIdsWithAppAccess, userHasAppAccessForAccount } from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

const WORKFLOWS_APP_SLUG = process.env.NEXT_PUBLIC_WORKFLOWS_APP_SLUG || "workflows";
const WORKFLOWS_ACCOUNT_COOKIE = "workflows_account_id";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function GET() {
  const { supabase, userId } = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("account_users").select("role, is_default, accounts!inner (id, name, account_type, icon_url)").eq("user_id", userId).order("is_default", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load accounts" }, { status: 500 });
  const accounts = (data ?? []).map((row) => { const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts; return account ? { id: account.id, name: account.name, accountType: account.account_type, iconUrl: account.icon_url, role: row.role, isDefault: row.is_default } : null; }).filter(Boolean) as Array<{ id: string; name: string; accountType: "personal" | "organization"; iconUrl: string | null; role: string; isDefault: boolean }>;
  const allowedIds = await getAccountIdsWithAppAccess(supabase, userId, WORKFLOWS_APP_SLUG, accounts.map((account) => account.id));
  const withAccess = accounts.map((account) => ({ ...account, hasAppAccess: allowedIds.has(account.id) }));
  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(WORKFLOWS_ACCOUNT_COOKIE)?.value;
  const activeAccountId = (preferred && withAccess.some((account) => account.id === preferred) ? preferred : null) ?? withAccess.find((account) => account.isDefault && account.hasAppAccess)?.id ?? withAccess.find((account) => account.hasAppAccess)?.id ?? null;
  return NextResponse.json({ accounts: withAccess, activeAccountId });
}

export async function POST(request: Request) {
  const { supabase, userId } = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { accountId?: string };
  const accountId = body.accountId?.trim();
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
  const { data: membership } = await supabase.from("account_users").select("account_id").eq("user_id", userId).eq("account_id", accountId).maybeSingle();
  if (!membership || !(await userHasAppAccessForAccount(supabase, userId, accountId, WORKFLOWS_APP_SLUG))) return NextResponse.json({ error: "No access to this account" }, { status: 403 });
  const hostname = (await headers()).get("host")?.split(":")[0];
  const sharedOptions = getActiveAccountCookieOptions(hostname);
  const cookieStore = await cookies();
  cookieStore.set(WORKFLOWS_ACCOUNT_COOKIE, accountId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  cookieStore.set(ACTIVE_ACCOUNT_COOKIE, accountId, sharedOptions);
  return NextResponse.json({ ok: true, activeAccountId: accountId });
}
