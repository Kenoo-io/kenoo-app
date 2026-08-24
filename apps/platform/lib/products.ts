import { createClient } from "@walls/supabase/server";

import type { CatalogProduct } from "@/components/platform/product-catalog";

export async function listPublishedProducts(): Promise<CatalogProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_products")
    .select(
      "id, slug, name, description, category, unit_amount_cents, is_live, docs_path",
    )
    .eq("is_published", true)
    .order("name");

  if (error) {
    console.error("[platform] list products:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return (data ?? []) as CatalogProduct[];
}
