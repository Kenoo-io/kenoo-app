import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";

import { extractBearerToken, hashApiKey } from "./api-keys";
import { consumeCreditsWithAutoTopup } from "./meter";

export type PlatformProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  unit_amount_cents: number;
  is_published: boolean;
  is_live: boolean;
  docs_path: string | null;
};

export async function getProductBySlug(
  admin: SupabaseClient,
  slug: string,
): Promise<PlatformProduct | null> {
  const { data } = await admin
    .from("platform_products")
    .select(
      "id, slug, name, description, category, unit_amount_cents, is_published, is_live, docs_path",
    )
    .eq("slug", slug)
    .maybeSingle();

  return (data as PlatformProduct | null) ?? null;
}

export async function authenticateApiKey(request: Request): Promise<
  | { error: NextResponse }
  | {
      admin: ReturnType<typeof createAdminClient>;
      key: { id: string; accountId: string };
    }
> {
  const secret = extractBearerToken(request);
  if (!secret) {
    return {
      error: NextResponse.json(
        { error: "Missing Authorization Bearer token" },
        { status: 401 },
      ),
    };
  }

  const admin = createAdminClient();
  const hash = hashApiKey(secret);
  const { data, error } = await admin
    .from("platform_api_keys")
    .select("id, account_id, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !data || data.revoked_at) {
    return {
      error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
    };
  }

  await admin
    .from("platform_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    admin,
    key: { id: data.id as string, accountId: data.account_id as string },
  };
}

type MeteredAuth = {
  admin: ReturnType<typeof createAdminClient>;
  key: { id: string; accountId: string };
  product: PlatformProduct;
  requestId: string;
};

function billingErrorResponse(
  product: PlatformProduct,
  billed: Awaited<ReturnType<typeof consumeCreditsWithAutoTopup>>,
): NextResponse | null {
  if (billed.ok) return null;

  if (billed.reason === "spend_limit") {
    return NextResponse.json(
      {
        error:
          "Monthly spend limit reached for this workspace. Raise or remove the limit in Limits.",
        balance_cents: billed.balanceCents,
      },
      { status: 429 },
    );
  }
  if (billed.reason === "product_blocked") {
    return NextResponse.json(
      {
        error: `${product.name} is blocked for this workspace.`,
        product: product.slug,
        balance_cents: billed.balanceCents,
      },
      { status: 403 },
    );
  }
  if (billed.reason === "rate_limit") {
    return NextResponse.json(
      {
        error: `Monthly request limit reached for ${product.name}.`,
        product: product.slug,
        balance_cents: billed.balanceCents,
      },
      { status: 429 },
    );
  }
  return NextResponse.json(
    {
      error:
        billed.reason === "auto_topup_failed"
          ? "Insufficient credits and auto top-up failed. Add a card or top up your wallet."
          : "Insufficient credits. Top up your wallet or enable auto top-up.",
      balance_cents: billed.balanceCents,
    },
    { status: 402 },
  );
}

async function resolveLiveProduct(
  request: Request,
  slug: string,
): Promise<{ error: NextResponse } | MeteredAuth> {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return auth;

  const { admin, key } = auth;
  const product = await getProductBySlug(admin, slug);

  if (!product || !product.is_published) {
    return {
      error: NextResponse.json({ error: "Unknown product" }, { status: 404 }),
    };
  }

  if (!product.is_live) {
    return {
      error: NextResponse.json(
        {
          error: `${product.name} is listed on Platform but is not live yet.`,
          product: product.slug,
        },
        { status: 501 },
      ),
    };
  }

  return {
    admin,
    key,
    product,
    requestId: request.headers.get("x-request-id")?.trim() || crypto.randomUUID(),
  };
}

export async function withMeteredProduct(
  request: Request,
  slug: string,
  handler: () => Promise<Record<string, unknown>>,
): Promise<NextResponse> {
  const resolved = await resolveLiveProduct(request, slug);
  if ("error" in resolved) return resolved.error;

  const { admin, key, product, requestId } = resolved;

  try {
    const payload = await handler();
    const billed = await consumeCreditsWithAutoTopup({
      admin,
      accountId: key.accountId,
      amountCents: product.unit_amount_cents,
      apiKeyId: key.id,
      productId: product.id,
      requestId,
      metadata: { product: product.slug },
    });

    const billingError = billingErrorResponse(product, billed);
    if (billingError) return billingError;

    return NextResponse.json({
      ...payload,
      usage: {
        product: product.slug,
        amount_cents: product.unit_amount_cents,
        request_id: requestId,
        usage_event_id: billed.ok ? billed.usageEventId : null,
        balance_cents: billed.ok ? billed.balanceCents : null,
      },
    });
  } catch (error) {
    console.error(`[platform] ${slug} handler:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product failed" },
      { status: 500 },
    );
  }
}

/** Charge first, then run a short enqueue handler (do not wait on research). */
export async function withMeteredEnqueue(
  request: Request,
  slug: string,
  handler: (ctx: MeteredAuth) => Promise<Record<string, unknown>>,
): Promise<NextResponse> {
  const resolved = await resolveLiveProduct(request, slug);
  if ("error" in resolved) return resolved.error;

  const { admin, key, product, requestId } = resolved;

  const billed = await consumeCreditsWithAutoTopup({
    admin,
    accountId: key.accountId,
    amountCents: product.unit_amount_cents,
    apiKeyId: key.id,
    productId: product.id,
    requestId,
    metadata: { product: product.slug },
  });

  const billingError = billingErrorResponse(product, billed);
  if (billingError) return billingError;

  try {
    const payload = await handler({ admin, key, product, requestId });
    return NextResponse.json({
      ...payload,
      usage: {
        product: product.slug,
        amount_cents: product.unit_amount_cents,
        request_id: requestId,
        usage_event_id: billed.ok ? billed.usageEventId : null,
        balance_cents: billed.ok ? billed.balanceCents : null,
      },
    });
  } catch (error) {
    console.error(`[platform] ${slug} enqueue:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product failed" },
      { status: 500 },
    );
  }
}
