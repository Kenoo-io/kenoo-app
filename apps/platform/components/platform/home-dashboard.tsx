import Link from "next/link";

import { formatUsdFromCents } from "@/lib/money";

import { ProductCatalog, type CatalogProduct } from "./product-catalog";

export function HomeDashboard({
  products,
  balanceCents,
  workspaceName,
  canManageKeys,
}: {
  products: CatalogProduct[];
  balanceCents: number;
  workspaceName: string | null;
  canManageKeys: boolean;
}) {
  const liveCount = products.filter((product) => product.is_live).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl bg-[#F3F3F4] px-6 py-6">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 70% 40%, rgba(196,181,253,0.7), transparent 55%), radial-gradient(circle at 90% 80%, rgba(253,224,71,0.55), transparent 50%), radial-gradient(circle at 50% 90%, rgba(110,231,183,0.45), transparent 45%)",
          }}
        />
        <div className="relative max-w-lg">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
            Build with Kenoo APIs
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-neutral-600">
            {workspaceName
              ? `This workspace is ${workspaceName}. Keys, credits, and usage stay with the account so teammates see the same data.`
              : "Create a key, add credits, and call Ping or Web Search today."}{" "}
            Company and people intel are listed and will go live next.
          </p>
          <Link
            href="/keys"
            className="mt-4 inline-flex rounded-lg bg-neutral-950 px-3.5 py-2 text-sm font-medium text-kenoo-white hover:bg-neutral-800"
          >
            {canManageKeys ? "Create an API key" : "View API keys"}
          </Link>
        </div>
      </section>

      <div className="grid overflow-hidden rounded-xl border border-neutral-200 sm:grid-cols-3">
        <MetricCard label="Credit balance" value={formatUsdFromCents(balanceCents)} href="/billing" action="Add credits" />
        <MetricCard label="Live products" value={String(liveCount)} href="/docs" />
        <MetricCard label="Catalog" value={String(products.length)} href="/docs" />
      </div>

      <ProductCatalog products={products} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  href,
  action,
}: {
  label: string;
  value: string;
  href: string;
  action?: string;
}) {
  return (
    <div className="border-b border-neutral-200 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-3 text-[28px] font-semibold tracking-tight">{value}</p>
      {action ? (
        <Link
          href={href}
          className="mt-4 inline-flex rounded-lg border border-neutral-200 bg-kenoo-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {action}
        </Link>
      ) : (
        <Link href={href} className="mt-4 inline-block text-xs text-neutral-400 hover:text-neutral-700">
          View
        </Link>
      )}
    </div>
  );
}
