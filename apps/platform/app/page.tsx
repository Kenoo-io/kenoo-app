import { HomeDashboard } from "@/components/platform/home-dashboard";
import { PageShell } from "@/components/platform/page-shell";
import {
  canManagePlatformKeys,
  getActiveAccount,
  getCurrentUserId,
} from "@/lib/account-context";
import { listPublishedProducts } from "@/lib/products";
import { ensureWallet } from "@/lib/wallet";
import { createAdminClient } from "@walls/supabase/admin";

export default async function HomePage() {
  const products = await listPublishedProducts();
  const userId = await getCurrentUserId();
  const account = userId ? await getActiveAccount(userId) : null;
  let balanceCents = 0;
  if (account) {
    try {
      const wallet = await ensureWallet(createAdminClient(), account.id);
      balanceCents = wallet.balance_cents;
    } catch {
      balanceCents = 0;
    }
  }

  return (
    <PageShell title="Home">
      <HomeDashboard
        products={products}
        balanceCents={balanceCents}
        workspaceName={account?.name ?? null}
        canManageKeys={account ? canManagePlatformKeys(account.role) : false}
      />
    </PageShell>
  );
}
