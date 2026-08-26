import type { SupabaseClient } from "@supabase/supabase-js";

export type MailSender = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  hasGmail: boolean;
};

function accountTypeOf(row: { accounts?: unknown }): string | null {
  const accounts = row.accounts;
  const obj = Array.isArray(accounts) ? accounts[0] : accounts;
  if (obj && typeof obj === "object" && "account_type" in obj) {
    return String((obj as { account_type?: string | null }).account_type ?? "") || null;
  }
  return null;
}

/**
 * Company inboxes for the mail picker: org account members plus WALLS `team` rows.
 * Gmail presence comes from `user_connection_presence` (no OAuth tokens).
 */
export async function fetchMailboxSenders(
  supabase: SupabaseClient,
  currentUserId: string | undefined,
): Promise<{ senders: MailSender[]; canViewTeammateInboxes: boolean }> {
  if (!currentUserId) {
    return { senders: [], canViewTeammateInboxes: false };
  }

  const [teamRes, membershipRes, meRes] = await Promise.all([
    supabase.from("team").select("user_id").not("user_id", "is", null),
    supabase
      .from("account_users")
      .select("account_id, role, accounts(account_type)")
      .eq("user_id", currentUserId),
    supabase.from("users").select("is_admin").eq("id", currentUserId).maybeSingle(),
  ]);

  if (teamRes.error) {
    console.error("[mail-senders] team:", teamRes.error);
  }
  if (membershipRes.error) {
    console.error("[mail-senders] account_users:", membershipRes.error);
  }

  const orgMemberships = (membershipRes.data ?? []).filter(
    (row) => accountTypeOf(row) === "organization",
  );
  const canViewTeammateInboxes =
    meRes.data?.is_admin === true ||
    orgMemberships.some((row) => row.role === "owner" || row.role === "admin");

  const orgAccountIds = orgMemberships
    .map((row) => row.account_id)
    .filter((id): id is string => Boolean(id));

  let accountUserIds: string[] = [];
  if (orgAccountIds.length > 0) {
    const { data, error } = await supabase
      .from("account_users")
      .select("user_id")
      .in("account_id", orgAccountIds);
    if (error) {
      console.error("[mail-senders] org members:", error);
    } else {
      accountUserIds = (data ?? []).map((row) => row.user_id).filter(Boolean);
    }
  }

  const userIds = Array.from(
    new Set([
      ...(teamRes.data ?? []).map((row) => row.user_id).filter(Boolean),
      ...accountUserIds,
    ]),
  ) as string[];

  if (userIds.length === 0) {
    return { senders: [], canViewTeammateInboxes };
  }

  const [{ data: presenceRows, error: presenceError }, { data: usersData, error: usersError }] =
    await Promise.all([
      supabase
        .from("user_connection_presence")
        .select("user_id")
        .in("user_id", userIds)
        .eq("provider", "google")
        .eq("service", "gmail")
        .is("revoked_at", null),
      supabase
        .from("users")
        .select("id, first_name, last_name, avatar_url, email")
        .in("id", userIds),
    ]);

  if (presenceError) {
    console.error("[mail-senders] user_connection_presence:", presenceError);
  }
  if (usersError) {
    throw usersError;
  }

  const usersWithGmail = new Set(
    (presenceRows ?? []).map((row) => row.user_id).filter(Boolean),
  );

  const senders: MailSender[] = (usersData ?? []).map((row) => {
    const firstName = row.first_name || "";
    const lastName = row.last_name || "";
    const displayName = `${firstName} ${lastName}`.trim() || row.email || "Unknown";
    return {
      id: row.id,
      displayName,
      email: row.email || "",
      avatarUrl: row.avatar_url,
      hasGmail: usersWithGmail.has(row.id),
    };
  });

  return { senders, canViewTeammateInboxes };
}
