import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  constructStripeWebhookEvent,
  getStripe,
} from "@walls/billing";
import { createAdminClient } from "@walls/supabase/admin";

import { creditWallet, ensureWallet } from "@/lib/wallet";

export const runtime = "nodejs";

async function savePaymentMethod(input: {
  accountId: string;
  customerId: string;
  paymentMethodId: string;
}) {
  const admin = createAdminClient();
  await ensureWallet(admin, input.accountId);
  await admin
    .from("platform_wallets")
    .update({
      stripe_customer_id: input.customerId,
      stripe_payment_method_id: input.paymentMethodId,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", input.accountId);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = constructStripeWebhookEvent(rawBody, signature);
  } catch (error) {
    console.error("[platform] stripe webhook signature:", error);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const stripe = getStripe();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const accountId = session.metadata?.account_id;
      const kind = session.metadata?.kind;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      if (!accountId || !customerId) {
        console.warn("[platform] checkout missing account/customer", session.id);
        return NextResponse.json({ received: true });
      }

      if (kind === "platform_setup_card" || session.mode === "setup") {
        const setupIntentId =
          typeof session.setup_intent === "string"
            ? session.setup_intent
            : session.setup_intent?.id;
        if (setupIntentId) {
          const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
          const paymentMethodId =
            typeof setupIntent.payment_method === "string"
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id;
          if (paymentMethodId) {
            await savePaymentMethod({
              accountId,
              customerId,
              paymentMethodId,
            });
          }
        }
      }

      if (kind === "platform_topup" || session.mode === "payment") {
        const amountCents =
          session.amount_total ??
          Number(session.metadata?.amount_cents ?? 0);
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;

        if (amountCents > 0) {
          await creditWallet({
            admin,
            accountId,
            amountCents,
            entryType: "topup",
            stripePaymentIntentId: paymentIntentId,
            metadata: { source: "checkout" },
          });
        }

        if (paymentIntentId) {
          const paymentIntent =
            await stripe.paymentIntents.retrieve(paymentIntentId);
          const paymentMethodId =
            typeof paymentIntent.payment_method === "string"
              ? paymentIntent.payment_method
              : paymentIntent.payment_method?.id;
          if (paymentMethodId) {
            await savePaymentMethod({
              accountId,
              customerId,
              paymentMethodId,
            });
          }
        }
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const accountId = paymentIntent.metadata?.account_id;
      const kind = paymentIntent.metadata?.kind;
      if (accountId && kind === "platform_auto_topup") {
        await creditWallet({
          admin,
          accountId,
          amountCents: paymentIntent.amount,
          entryType: "auto_topup",
          stripePaymentIntentId: paymentIntent.id,
          metadata: { source: "auto_topup_webhook" },
        });
      }
    }
  } catch (error) {
    console.error("[platform] stripe webhook handler:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
