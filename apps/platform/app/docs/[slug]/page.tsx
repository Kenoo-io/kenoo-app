import { DocsContent } from "@/components/platform/docs-content";
import { PageShell } from "@/components/platform/page-shell";
import { listPublishedProducts } from "@/lib/products";

export default async function ProductDocsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await listPublishedProducts();
  const product = products.find((item) => item.slug === slug);

  return (
    <PageShell
      title={product?.name ?? "Product docs"}
      description={
        product?.description ??
        "This product is not published yet, or the Platform catalog has not been migrated."
      }
      backHref="/docs"
      backLabel="Documentation"
    >
      <DocsContent products={products} slug={slug} />
    </PageShell>
  );
}
