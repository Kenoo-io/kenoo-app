import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { getStripe } from "@walls/billing";

import { creditWallet, ensureWallet } from "./wallet";

export type MeteredKey = {
  id: string;
  account_id: string;
};

export type ConsumeFailReason =
  | "insufficient_funds"
  | "auto_topup_failed"
  | "spend_limit"
  | "product_blocked"
  | "rate_limit";

export type ConsumeResult =
  | { ok: true; balanceCents: number; usageEventId: string }
  | { ok: false; reason: ConsumeFailReason; balanceCents: number };

async function tryConsume(
  admin: SupabaseClient,
  input: {
    accountId: string;
    amountCents: number;
    apiKeyId: string;
    productId: string;
    requestId: string;
    units?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<ConsumeResult> {
  const { data, error } = await admin.rpc("platform_consume_credits", {
    p_account_id: input.accountId,
    p_amount_cents: input.amountCents,
    p_api_key_id: input.apiKeyId,
    p_product_id: input.productId,
    p_request_id: input.requestId,
    p_units: input.units ?? 1,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.ok) {
    return {
      ok: true,
      balanceCents: Number(row.balance_cents ?? 0),
      usageEventId: String(row.usage_event_id),
    };
  }

  const reason = row?.reason as ConsumeFailReason | undefined;
  return {
    ok: false,
    reason:
      reason === "spend_limit" ||
      reason === "product_blocked" ||
      reason === "rate_limit"
        ? reason
        : "insufficient_funds",
    balanceCents: Number(row?.balance_cents ?? 0),
  };
}

async function chargeAutoTopup(input: {
  admin: SupabaseClient;
  stripe: Stripe;
  accountId: string;
  amountCents: number;
}): Promise<boolean> {
  const wallet = await ensureWallet(input.admin, input.accountId);
  if (
    !wallet.auto_topup_enabled ||
    !wallet.stripe_customer_id ||
    !wallet.stripe_payment_method_id
  ) {
    return false;
  }

  const amount = Math.max(wallet.auto_topup_amount_cents, input.amountCents);

  try {
    const paymentIntent = await input.stripe.paymentIntents.create(
      {
        amount,
        currency: "usd",
        customer: wallet.stripe_customer_id,
        payment_method: wallet.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: {
          account_id: input.accountId,
          kind: "platform_auto_topup",
        },
      },
      {
        idempotencyKey: `platform-auto-topup-${input.accountId}-${wallet.balance_cents}`,
      },
    );

    if (paymentIntent.status !== "succeeded") {
      return false;
    }

    await creditWallet({
      admin: input.admin,
      accountId: input.accountId,
      amountCents: amount,
      entryType: "auto_topup",
      stripePaymentIntentId: paymentIntent.id,
      metadata: { source: "auto_topup" },
    });

    return true;
  } catch (error) {
    console.error("[platform] auto top-up failed:", error);
    return false;
  }
}

export async function consumeCreditsWithAutoTopup(input: {
  admin: SupabaseClient;
  accountId: string;
  amountCents: number;
  apiKeyId: string;
  productId: string;
  requestId: string;
  units?: number;
  metadata?: Record<string, unknown>;
}): Promise<ConsumeResult> {
  const first = await tryConsume(input.admin, input);
  if (first.ok) return first;
  if (
    first.reason === "spend_limit" ||
    first.reason === "product_blocked" ||
    first.reason === "rate_limit"
  ) {
    return first;
  }

  const wallet = await ensureWallet(input.admin, input.accountId);
  const shouldTopup =
    wallet.auto_topup_enabled &&
    (wallet.balance_cents <= wallet.auto_topup_threshold_cents ||
      wallet.balance_cents < input.amountCents);

  if (!shouldTopup) return first;

  const stripe = getStripe();
  const charged = await chargeAutoTopup({
    admin: input.admin,
    stripe,
    accountId: input.accountId,
    amountCents: Math.max(
      wallet.auto_topup_amount_cents,
      input.amountCents - wallet.balance_cents,
    ),
  });

  if (!charged) {
    return { ...first, reason: "auto_topup_failed" };
  }

  return tryConsume(input.admin, input);
}
