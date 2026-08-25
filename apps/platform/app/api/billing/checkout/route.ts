import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";

import { requirePlatformBillingManager } from "@/lib/account-context";
import {
  createPlatformCardSetupSession,
  createPlatformTopupSession,
} from "@/lib/stripe-sessions";

type CheckoutBody = {
  kind?: "topup" | "setup_card";
  amountCents?: number;
};

const ALLOWED_TOPUPS = new Set([1000, 2500, 5000, 10000, 25000]);

export async function POST(request: Request) {
  const auth = await requirePlatformBillingManager();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutBody;
  const admin = createAdminClient();
  const { data: account } = await admin
    .from("accounts")
    .select("id, name, email")
    .eq("id", auth.account.id)
    .maybeSingle();

  try {
    if (body.kind === "setup_card") {
      const session = await createPlatformCardSetupSession({
        request,
        accountId: auth.account.id,
        userId: auth.userId,
        email: account?.email,
        name: account?.name,
      });
      return NextResponse.json(session);
    }

    const amountCents = body.amountCents ?? 2500;
    if (!ALLOWED_TOPUPS.has(amountCents)) {
      return NextResponse.json({ error: "Invalid top-up amount" }, { status: 400 });
    }

    const session = await createPlatformTopupSession({
      request,
      accountId: auth.account.id,
      userId: auth.userId,
      email: account?.email,
      name: account?.name,
      amountCents,
    });
    return NextResponse.json(session);
  } catch (error) {
    console.error("[platform] billing checkout:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start checkout",
      },
      { status: 500 },
    );
  }
}
