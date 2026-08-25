import { createAdminClient } from "@walls/supabase/admin";

import { LimitsPanel } from "@/components/platform/limits-panel";
import {
  canEditPlatformBudget,
  getActiveAccount,
  getCurrentUserId,
} from "@/lib/account-context";
import {
  daysUntilUtcMonthReset,
  listProductLimits,
  listSpendAlerts,
  monthRequestCounts,
  monthUsageSpendCents,
} from "@/lib/limits";
import { ensureWallet } from "@/lib/wallet";

export default async function LimitsPage() {
  const userId = await getCurrentUserId();
  const account = userId ? await getActiveAccount(userId) : null;
  const admin = createAdminClient();

  let monthlySpendLimitCents: number | null = null;
  let spentThisMonthCents = 0;
  let autoTopupEnabled = false;
  let autoTopupThresholdCents = 500;
  let autoTopupAmountCents = 2500;
  let hasCard = false;
  let productLimits: Awaited<ReturnType<typeof listProductLimits>> = [];
  let requestCounts: Record<string, number> = {};
  let spendAlerts: Awaited<ReturnType<typeof listSpendAlerts>> = [];

  const { data: products } = await admin
    .from("platform_products")
    .select("id, slug, name, is_live")
    .eq("is_published", true)
    .order("name");

  if (account) {
    try {
      const wallet = await ensureWallet(admin, account.id);
      monthlySpendLimitCents = wallet.monthly_spend_limit_cents;
      autoTopupEnabled = wallet.auto_topup_enabled;
      autoTopupThresholdCents = wallet.auto_topup_threshold_cents;
      autoTopupAmountCents = wallet.auto_topup_amount_cents;
      hasCard = Boolean(wallet.stripe_payment_method_id);
    } catch (error) {
      console.error("[platform] limits wallet:", error);
    }
    spentThisMonthCents = await monthUsageSpendCents(admin, account.id);
    productLimits = await listProductLimits(admin, account.id);
    requestCounts = await monthRequestCounts(admin, account.id);
    spendAlerts = await listSpendAlerts(admin, account.id);
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-8 md:px-10 md:py-10">
      <LimitsPanel
        workspaceName={account?.name ?? "this workspace"}
        canEdit={account ? canEditPlatformBudget(account.role) : false}
        monthlySpendLimitCents={monthlySpendLimitCents}
        spentThisMonthCents={spentThisMonthCents}
        daysUntilReset={daysUntilUtcMonthReset()}
        autoTopupEnabled={autoTopupEnabled}
        autoTopupThresholdCents={autoTopupThresholdCents}
        autoTopupAmountCents={autoTopupAmountCents}
        hasCard={hasCard}
        spendAlerts={spendAlerts}
        products={products ?? []}
        productLimits={productLimits}
        requestCounts={requestCounts}
      />
    </div>
  );
}
