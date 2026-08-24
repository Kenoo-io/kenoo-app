import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@walls/supabase/server";

import type { PlatformAccount, PlatformAccountMember, PlatformAccountType } from "./account-types";

export type { PlatformAccount, PlatformAccountMember, PlatformAccountType } from "./account-types";

export const PLATFORM_ACCOUNT_COOKIE = "platform_account_id";

export const PLATFORM_APP_SLUG =
  process.env.NEXT_PUBLIC_PLATFORM_APP_SLUG || "platform";

type AccountMembershipRow = {
  role: string;
  is_default: boolean;
  accounts:
    | {
        id: string;
        name: string;
        account_type: PlatformAccountType;
        icon_url: string | null;
      }
    | {
        id: string;
        name: string;
        account_type: PlatformAccountType;
        icon_url: string | null;
      }[]
    | null;
};

function mapMembership(row: AccountMembershipRow): PlatformAccount | null {
  const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    accountType: account.account_type,
    iconUrl: account.icon_url,
    role: row.role,
    isDefault: row.is_default,
    hasAppAccess: true,
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listAccountsForUser(
  userId: string,
): Promise<PlatformAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_users")
    .select(
      `role, is_default, accounts!inner (
        id, name, account_type, icon_url
      )`,
    )
    .eq("user_id", userId)
    .order("is_default", { ascending: false });

  if (error) {
    console.error("[platform] list accounts:", error);
    return [];
  }

  const accounts = (data ?? [])
    .map((row) => mapMembership(row as AccountMembershipRow))
    .filter((account): account is PlatformAccount => account !== null);

  return accounts.sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

type AccountMemberRow = {
  id: string;
  user_id: string;
  role: string;
  users:
    | {
        first_name: string | null;
        last_name: string | null;
        email: string;
        avatar_url: string | null;
      }
    | {
        first_name: string | null;
        last_name: string | null;
        email: string;
        avatar_url: string | null;
      }[]
    | null;
};

const ROLE_ORDER = ["owner", "admin", "member"];

export async function listAccountMembers(
  accountId: string,
): Promise<PlatformAccountMember[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_users")
    .select(
      `id, user_id, role, users (
        first_name, last_name, email, avatar_url
      )`,
    )
    .eq("account_id", accountId);

  if (error) {
    console.error("[platform] list account members:", error);
    return [];
  }

  const members = (data ?? [])
    .map((row) => {
      const membership = row as AccountMemberRow;
      const user = Array.isArray(membership.users)
        ? membership.users[0]
        : membership.users;
      if (!user) return null;
      return {
        id: membership.id,
        userId: membership.user_id,
        role: membership.role,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        avatarUrl: user.avatar_url,
      } satisfies PlatformAccountMember;
    })
    .filter((member): member is PlatformAccountMember => member !== null);

  return members.sort((left, right) => {
    const leftRank = ROLE_ORDER.indexOf(left.role.toLowerCase());
    const rightRank = ROLE_ORDER.indexOf(right.role.toLowerCase());
    const rankedLeft = leftRank === -1 ? ROLE_ORDER.length : leftRank;
    const rankedRight = rightRank === -1 ? ROLE_ORDER.length : rightRank;
    if (rankedLeft !== rankedRight) return rankedLeft - rankedRight;
    const leftName = `${left.firstName ?? ""} ${left.lastName ?? ""}`.trim() || left.email;
    const rightName = `${right.firstName ?? ""} ${right.lastName ?? ""}`.trim() || right.email;
    return leftName.localeCompare(rightName);
  });
}

export async function getAccountMembership(
  userId: string,
  accountId: string,
): Promise<{ role: string; isDefault: boolean } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_users")
    .select("role, is_default")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (error || !data) return null;
  return { role: data.role as string, isDefault: data.is_default as boolean };
}

export async function getActiveAccount(
  userId: string,
): Promise<PlatformAccount | null> {
  const accounts = await listAccountsForUser(userId);
  if (accounts.length === 0) return null;

  const cookieStore = await cookies();
  const preferredAccountId =
    cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ??
    cookieStore.get(PLATFORM_ACCOUNT_COOKIE)?.value ??
    null;

  const fromCookie = preferredAccountId
    ? accounts.find(
        (account) => account.id === preferredAccountId && account.hasAppAccess,
      )
    : undefined;
  if (fromCookie) return fromCookie;

  const accessible = accounts.filter((account) => account.hasAppAccess);
  return (
    accessible.find((account) => account.isDefault) ?? accessible[0] ?? null
  );
}

export async function resolveActiveAccountId(
  userId: string,
): Promise<string | null> {
  const account = await getActiveAccount(userId);
  return account?.id ?? null;
}

export function canManagePlatformKeys(role: string): boolean {
  return ["owner", "admin"].includes(role.toLowerCase());
}

export function canManagePlatformBilling(role: string): boolean {
  return ["owner", "admin"].includes(role.toLowerCase());
}

export function canEditPlatformBudget(role: string): boolean {
  return ["owner", "admin", "member"].includes(role.toLowerCase());
}

export async function requirePlatformAccount() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  const account = await getActiveAccount(userId);
  if (!account) {
    return {
      error: "Join or select a Kenoo workspace to use Platform" as const,
      status: 403 as const,
    };
  }

  return { userId, account };
}

export async function requirePlatformManager() {
  const auth = await requirePlatformAccount();
  if ("error" in auth) return auth;
  if (!canManagePlatformKeys(auth.account.role)) {
    return {
      error:
        "Only workspace owners and admins can create or revoke API keys" as const,
      status: 403 as const,
    };
  }
  return auth;
}

export async function requirePlatformBillingManager() {
  const auth = await requirePlatformAccount();
  if ("error" in auth) return auth;
  if (!canManagePlatformBilling(auth.account.role)) {
    return {
      error:
        "Only workspace owners and admins can add cards or purchase credits" as const,
      status: 403 as const,
    };
  }
  return auth;
}

export async function requirePlatformBudgetEditor() {
  const auth = await requirePlatformAccount();
  if ("error" in auth) return auth;
  if (!canEditPlatformBudget(auth.account.role)) {
    return {
      error:
        "You do not have permission to edit budget settings for this workspace" as const,
      status: 403 as const,
    };
  }
  return auth;
}
