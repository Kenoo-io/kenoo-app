import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import {
  ACTIVE_ACCOUNT_COOKIE,
  getActiveAccountCookieOptions,
  resolveActiveAccountId,
} from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

type PortalAccount = {
  id: string;
  name: string;
  accountType: "personal" | "organization";
  iconUrl: string | null;
  isDefault: boolean;
};

async function listAccountsForUser(userId: string): Promise<PortalAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_users")
    .select(
      `is_default, accounts!inner (
        id, name, account_type, icon_url
      )`,
    )
    .eq("user_id", userId)
    .order("is_default", { ascending: false });

  if (error) {
    console.error("[portal] list accounts:", error);
    return [];
  }

  const accounts: PortalAccount[] = [];
  for (const row of data ?? []) {
    const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
    if (!account) continue;
    accounts.push({
      id: account.id as string,
      name: account.name as string,
      accountType: account.account_type as "personal" | "organization",
      iconUrl: (account.icon_url as string | null) ?? null,
      isDefault: Boolean(row.is_default),
    });
  }

  return accounts.sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const cookieStore = await cookies();
  const preferredAccountId =
    cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? null;

  const [accounts, activeAccountId] = await Promise.all([
    listAccountsForUser(userId),
    resolveActiveAccountId(supabase, userId, preferredAccountId),
  ]);

  return NextResponse.json({ accounts, activeAccountId });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    accountId?: string;
  };

  const accountId = body.accountId?.trim();
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("account_users")
    .select("account_id")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this account" },
      { status: 403 },
    );
  }

  const headerStore = await headers();
  const hostname = headerStore.get("host")?.split(":")[0];
  const cookieStore = await cookies();
  cookieStore.set(
    ACTIVE_ACCOUNT_COOKIE,
    accountId,
    getActiveAccountCookieOptions(hostname),
  );

  return NextResponse.json({ ok: true, activeAccountId: accountId });
}
