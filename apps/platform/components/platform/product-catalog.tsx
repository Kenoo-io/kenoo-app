import Link from "next/link";

import { formatUsdFromCents } from "@/lib/money";

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  unit_amount_cents: number;
  is_live: boolean;
  docs_path: string | null;
};

export function ProductCatalog({ products }: { products: CatalogProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-16 text-center text-sm text-neutral-500">
        No products are published yet.
      </div>
    );
  }

  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 md:grid-cols-2">
      {products.map((product) => (
        <article key={product.id} className="bg-kenoo-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-neutral-400">{product.category}</p>
              <h2 className="mt-1 text-base font-semibold text-neutral-950">
                {product.name}
              </h2>
            </div>
            <span
              className={
                product.is_live
                  ? "text-xs font-medium text-emerald-600"
                  : "text-xs font-medium text-neutral-400"
              }
            >
              {product.is_live ? "Live" : "Soon"}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-neutral-500">
            {product.description}
          </p>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                {formatUsdFromCents(product.unit_amount_cents)}
              </p>
              <p className="text-xs text-neutral-400">per request</p>
            </div>
            <Link
              href={product.docs_path || `/docs/${product.slug}`}
              className="rounded-lg bg-neutral-950 px-3 py-1.5 text-sm font-medium text-kenoo-white hover:bg-neutral-800"
            >
              Docs
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
