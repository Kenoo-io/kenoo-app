import { DocsContent } from "@/components/platform/docs-content";
import { PageShell } from "@/components/platform/page-shell";
import { listPublishedProducts } from "@/lib/products";

export default async function DocsPage() {
  const products = await listPublishedProducts();

  return (
    <PageShell
      title="Documentation"
    >
      <DocsContent products={products} />
    </PageShell>
  );
}
