import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";

import { requirePlatformBudgetEditor } from "@/lib/account-context";
import { ensureWallet } from "@/lib/wallet";

type LimitsBody = {
  kind?: "spend" | "products" | "rates" | "alert-add" | "alert-update" | "alert-delete";
  monthlySpendLimitCents?: number | null;
  blockedProductIds?: string[];
  rateLimits?: { productId: string; monthlyRequestLimit: number | null }[];
  alertId?: string;
  thresholdPercent?: number;
};

export async function POST(request: Request) {
  const auth = await requirePlatformBudgetEditor();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as LimitsBody;
  const admin = createAdminClient();
  await ensureWallet(admin, auth.account.id);

  try {
    if (body.kind === "spend") {
      const limit =
        body.monthlySpendLimitCents === null ||
        body.monthlySpendLimitCents === undefined
          ? null
          : Math.round(body.monthlySpendLimitCents);

      if (limit !== null && limit < 100) {
        return NextResponse.json(
          { error: "Spend limit must be at least $1" },
          { status: 400 },
        );
      }

      const { error } = await admin
        .from("platform_wallets")
        .update({
          monthly_spend_limit_cents: limit,
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", auth.account.id);

      if (error) throw error;
      return NextResponse.json({ monthly_spend_limit_cents: limit });
    }

    if (body.kind === "products") {
      const blocked = new Set(body.blockedProductIds ?? []);
      const { data: products, error: productsError } = await admin
        .from("platform_products")
        .select("id")
        .eq("is_published", true);

      if (productsError) throw productsError;

      for (const product of products ?? []) {
        const isBlocked = blocked.has(product.id as string);
        const { data: existing } = await admin
          .from("platform_product_limits")
          .select("monthly_request_limit")
          .eq("account_id", auth.account.id)
          .eq("product_id", product.id)
          .maybeSingle();

        if (!isBlocked && !existing) continue;

        if (!isBlocked && existing && existing.monthly_request_limit == null) {
          const { error } = await admin
            .from("platform_product_limits")
            .delete()
            .eq("account_id", auth.account.id)
            .eq("product_id", product.id);
          if (error) throw error;
          continue;
        }

        const { error } = await admin.from("platform_product_limits").upsert({
          account_id: auth.account.id,
          product_id: product.id,
          blocked: isBlocked,
          monthly_request_limit: existing?.monthly_request_limit ?? null,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      return NextResponse.json({ ok: true });
    }

    if (body.kind === "rates") {
      const { data: products, error: productsError } = await admin
        .from("platform_products")
        .select("id")
        .eq("is_published", true);

      if (productsError) throw productsError;

      const byId = new Map(
        (body.rateLimits ?? []).map((row) => [row.productId, row.monthlyRequestLimit]),
      );

      for (const product of products ?? []) {
        const nextLimit = byId.has(product.id as string)
          ? byId.get(product.id as string) ?? null
          : undefined;
        if (nextLimit === undefined) continue;

        const { data: existing } = await admin
          .from("platform_product_limits")
          .select("blocked")
          .eq("account_id", auth.account.id)
          .eq("product_id", product.id)
          .maybeSingle();

        if (nextLimit === null && !existing?.blocked) {
          if (existing) {
            const { error } = await admin
              .from("platform_product_limits")
              .delete()
              .eq("account_id", auth.account.id)
              .eq("product_id", product.id);
            if (error) throw error;
          }
          continue;
        }

        if (nextLimit !== null && nextLimit < 1) {
          return NextResponse.json(
            { error: "Request limits must be at least 1" },
            { status: 400 },
          );
        }

        const { error } = await admin.from("platform_product_limits").upsert({
          account_id: auth.account.id,
          product_id: product.id,
          blocked: Boolean(existing?.blocked),
          monthly_request_limit: nextLimit,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      return NextResponse.json({ ok: true });
    }

    if (body.kind === "alert-add" || body.kind === "alert-update") {
      const percent = Math.round(body.thresholdPercent ?? 0);
      if (percent < 1 || percent > 100) {
        return NextResponse.json(
          { error: "Alert threshold must be between 1% and 100%" },
          { status: 400 },
        );
      }

      if (body.kind === "alert-update") {
        const alertId = body.alertId?.trim();
        if (!alertId) {
          return NextResponse.json({ error: "alertId required" }, { status: 400 });
        }
        const { error } = await admin
          .from("platform_spend_alerts")
          .update({ threshold_percent: percent })
          .eq("id", alertId)
          .eq("account_id", auth.account.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      const { error } = await admin.from("platform_spend_alerts").insert({
        account_id: auth.account.id,
        threshold_percent: percent,
      });
      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "An alert already exists for that percentage" },
            { status: 400 },
          );
        }
        throw error;
      }
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "alert-delete") {
      const alertId = body.alertId?.trim();
      if (!alertId) {
        return NextResponse.json({ error: "alertId required" }, { status: 400 });
      }
      const { error } = await admin
        .from("platform_spend_alerts")
        .delete()
        .eq("id", alertId)
        .eq("account_id", auth.account.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown limits update" }, { status: 400 });
  } catch (error) {
    console.error("[platform] limits:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save limits" },
      { status: 500 },
    );
  }
}
