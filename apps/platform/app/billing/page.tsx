import { createAdminClient } from "@walls/supabase/admin";

import { BillingPanel, type LedgerRow } from "@/components/platform/billing-panel";
import {
  canEditPlatformBudget,
  canManagePlatformBilling,
  getActiveAccount,
  getCurrentUserId,
  listAccountMembers,
  type PlatformAccountMember,
} from "@/lib/account-context";
import { ensureWallet } from "@/lib/wallet";

export default async function BillingPage() {
  const userId = await getCurrentUserId();
  const account = userId ? await getActiveAccount(userId) : null;
  const admin = createAdminClient();

  let wallet = {
    balance_cents: 0,
    auto_topup_enabled: false,
    auto_topup_threshold_cents: 500,
    auto_topup_amount_cents: 2500,
    has_card: false,
  };
  let ledger: LedgerRow[] = [];
  let members: PlatformAccountMember[] = [];

  if (account) {
    try {
      const loaded = await ensureWallet(admin, account.id);
      wallet = {
        balance_cents: loaded.balance_cents,
        auto_topup_enabled: loaded.auto_topup_enabled,
        auto_topup_threshold_cents: loaded.auto_topup_threshold_cents,
        auto_topup_amount_cents: loaded.auto_topup_amount_cents,
        has_card: Boolean(loaded.stripe_payment_method_id),
      };
    } catch (error) {
      console.error("[platform] billing wallet:", error);
    }

    const { data } = await admin
      .from("platform_ledger_entries")
      .select("id, created_at, entry_type, amount_cents")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(50);
    ledger = (data ?? []) as LedgerRow[];
    members = await listAccountMembers(account.id);
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8 md:px-10 md:py-10">
      <BillingPanel
        wallet={wallet}
        workspaceName={account?.name ?? "this workspace"}
        canManageBilling={
          account ? canManagePlatformBilling(account.role) : false
        }
        canEditBudget={account ? canEditPlatformBudget(account.role) : false}
        ledger={ledger}
        members={members}
        currentUserId={userId}
      />
    </div>
  );
}
