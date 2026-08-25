import { createAdminClient } from "@walls/supabase/admin";

import { KeysPanel } from "@/components/platform/keys-panel";
import {
  canManagePlatformKeys,
  getActiveAccount,
  getCurrentUserId,
} from "@/lib/account-context";
import { listPlatformApiKeys } from "@/lib/list-api-keys";

export default async function KeysPage() {
  const userId = await getCurrentUserId();
  const account = userId ? await getActiveAccount(userId) : null;
  const admin = createAdminClient();
  const keys = account ? await listPlatformApiKeys(admin, account.id) : [];

  let currentUserName = "You";
  if (userId) {
    const { data: user } = await admin
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .maybeSingle();
    if (user) {
      const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
      currentUserName = name || (user.email as string) || "You";
    }
  }

  return (
    <KeysPanel
      initialKeys={keys}
      canManage={account ? canManagePlatformKeys(account.role) : false}
      currentUserName={currentUserName}
    />
  );
}
