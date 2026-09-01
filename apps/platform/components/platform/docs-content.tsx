import { getPublicApiBase } from "@/lib/api-origin";
import { formatUsdFromCents } from "@/lib/money";

import type { CatalogProduct } from "./product-catalog";

function docsExample(apiBase: string, slug: string): string {
  if (slug === "web-search") {
    return `curl -X POST ${apiBase}/web-search \\
  -H "Authorization: Bearer knp_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"kenoo platform"}'`;
  }

  if (slug === "people-enrichment") {
    return `curl -X POST ${apiBase}/people-enrichment \\
  -H "Authorization: Bearer knp_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Doe","email":"jane@acme.com","location":{"city":"Austin","state":"TX"}}'

# Poll until status is completed or failed (research can take several minutes)
curl ${apiBase}/people-enrichment/jobs/JOB_ID \\
  -H "Authorization: Bearer knp_live_YOUR_KEY"`;
  }

  return `curl -X GET ${apiBase}/${slug} \\
  -H "Authorization: Bearer knp_live_YOUR_KEY"`;
}

export function DocsContent({
  products,
  slug,
}: {
  products: CatalogProduct[];
  slug?: string;
}) {
  const apiBase = getPublicApiBase();
  const selected = slug
    ? products.find((product) => product.slug === slug)
    : null;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-neutral-200 bg-kenoo-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">How it works</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-neutral-600">
          <li>Create an API key on the Keys page.</li>
          <li>Add a card and top up credits on Billing. Turn on auto top-up if you want the wallet to refill itself.</li>
          <li>
            Call products with{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
              Authorization: Bearer knp_live_…
            </code>
          </li>
          <li>
            Metered routes live at <code className="font-mono text-xs">{apiBase}</code> today.
            The public gateway will move to <code className="font-mono text-xs">https://api.kenoo.io</code> later without changing the key format.
          </li>
        </ol>
      </section>

      {selected ? (
        <section className="rounded-xl border border-neutral-200 bg-kenoo-white p-5">
          <h2 className="text-lg font-semibold text-neutral-950">
            {selected.name}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">{selected.description}</p>
          <p className="mt-3 text-sm text-neutral-600">
            {formatUsdFromCents(selected.unit_amount_cents)} per request
            {selected.is_live ? "" : " · not live yet"}
            {selected.slug === "people-enrichment"
              ? " · billed when the job is accepted, even if research later fails"
              : ""}
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
            {docsExample(apiBase, selected.slug)}
          </pre>
        </section>
      ) : (
        <section className="rounded-xl border border-neutral-200 bg-kenoo-white p-5">
          <h2 className="text-lg font-semibold text-neutral-950">Products</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-600">
            {products.map((product) => (
              <li key={product.id}>
                <a
                  className="font-medium text-neutral-950 underline-offset-4 hover:underline"
                  href={`/docs/${product.slug}`}
                >
                  {product.name}
                </a>
                {" — "}
                {formatUsdFromCents(product.unit_amount_cents)} / request
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
