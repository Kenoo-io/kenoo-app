import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";

import { requirePlatformAccount } from "@/lib/account-context";
import { ensureWallet } from "@/lib/wallet";

export async function GET() {
  const auth = await requirePlatformAccount();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const wallet = await ensureWallet(admin, auth.account.id);

  return NextResponse.json({
    wallet: {
      ...wallet,
      has_card: Boolean(wallet.stripe_payment_method_id),
    },
  });
}
