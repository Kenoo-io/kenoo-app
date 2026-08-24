import {
  ensureStripeCustomerId,
  getStripe,
} from "@walls/billing";
import { createAdminClient } from "@walls/supabase/admin";

import { ensureWallet } from "./wallet";

function absoluteUrl(request: Request, path: string): string {
  return new URL(path, request.url).toString();
}

export async function createPlatformTopupSession(input: {
  request: Request;
  accountId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  amountCents: number;
}) {
  const admin = createAdminClient();
  const stripe = getStripe();
  const wallet = await ensureWallet(admin, input.accountId);
  const stripeCustomerId =
    wallet.stripe_customer_id ||
    (await ensureStripeCustomerId({
      admin,
      stripe,
      accountId: input.accountId,
      email: input.email,
      name: input.name,
    }));

  if (!wallet.stripe_customer_id) {
    await admin
      .from("platform_wallets")
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", input.accountId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    success_url: `${absoluteUrl(input.request, "/billing")}?topup=success`,
    cancel_url: `${absoluteUrl(input.request, "/billing")}?topup=canceled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          product_data: {
            name: "Kenoo Platform credits",
            description: "Prepaid API credits",
          },
        },
      },
    ],
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: {
        account_id: input.accountId,
        user_id: input.userId,
        kind: "platform_topup",
      },
    },
    metadata: {
      account_id: input.accountId,
      user_id: input.userId,
      kind: "platform_topup",
      amount_cents: String(input.amountCents),
    },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session was created without a URL");
  }

  return { url: session.url, sessionId: session.id };
}

export async function createPlatformCardSetupSession(input: {
  request: Request;
  accountId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  const admin = createAdminClient();
  const stripe = getStripe();
  const wallet = await ensureWallet(admin, input.accountId);
  const stripeCustomerId =
    wallet.stripe_customer_id ||
    (await ensureStripeCustomerId({
      admin,
      stripe,
      accountId: input.accountId,
      email: input.email,
      name: input.name,
    }));

  if (!wallet.stripe_customer_id) {
    await admin
      .from("platform_wallets")
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", input.accountId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: stripeCustomerId,
    success_url: `${absoluteUrl(input.request, "/billing")}?card=success`,
    cancel_url: `${absoluteUrl(input.request, "/billing")}?card=canceled`,
    metadata: {
      account_id: input.accountId,
      user_id: input.userId,
      kind: "platform_setup_card",
    },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session was created without a URL");
  }

  return { url: session.url, sessionId: session.id };
}
