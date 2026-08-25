import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";

import { requirePlatformBudgetEditor } from "@/lib/account-context";
import { ensureWallet } from "@/lib/wallet";

type AutoTopupBody = {
  enabled?: boolean;
  thresholdCents?: number;
  amountCents?: number;
};

export async function POST(request: Request) {
  const auth = await requirePlatformBudgetEditor();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as AutoTopupBody;
  const admin = createAdminClient();
  await ensureWallet(admin, auth.account.id);

  const thresholdCents = Math.max(100, Math.round(body.thresholdCents ?? 500));
  const amountCents = Math.max(1000, Math.round(body.amountCents ?? 2500));

  const { data, error } = await admin
    .from("platform_wallets")
    .update({
      auto_topup_enabled: Boolean(body.enabled),
      auto_topup_threshold_cents: thresholdCents,
      auto_topup_amount_cents: amountCents,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", auth.account.id)
    .select(
      "auto_topup_enabled, auto_topup_threshold_cents, auto_topup_amount_cents",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
