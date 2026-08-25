import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformWallet = {
  account_id: string;
  balance_cents: number;
  auto_topup_enabled: boolean;
  auto_topup_threshold_cents: number;
  auto_topup_amount_cents: number;
  monthly_spend_limit_cents: number | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
};

export async function ensureWallet(
  admin: SupabaseClient,
  accountId: string,
): Promise<PlatformWallet> {
  await admin.rpc("platform_ensure_wallet", { p_account_id: accountId });

  const { data, error } = await admin
    .from("platform_wallets")
    .select(
      "account_id, balance_cents, auto_topup_enabled, auto_topup_threshold_cents, auto_topup_amount_cents, monthly_spend_limit_cents, stripe_customer_id, stripe_payment_method_id",
    )
    .eq("account_id", accountId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "Failed to load Platform wallet");
  }

  return data as PlatformWallet;
}

export async function creditWallet(input: {
  admin: SupabaseClient;
  accountId: string;
  amountCents: number;
  entryType: string;
  stripePaymentIntentId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const { data, error } = await input.admin.rpc("platform_credit_wallet", {
    p_account_id: input.accountId,
    p_amount_cents: input.amountCents,
    p_entry_type: input.entryType,
    p_stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}
