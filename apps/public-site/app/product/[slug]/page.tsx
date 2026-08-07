import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FeaturedProductPage } from "@/components/kenoo/featured-product-page";
import {
  FEATURED_PRODUCTS,
  getFeaturedProduct,
} from "@/lib/featured-products";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return FEATURED_PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getFeaturedProduct(slug);
  if (!product) {
    return { title: "Product" };
  }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} | Kenoo`,
      description: product.description,
      images: [{ url: product.icon }],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const product = getFeaturedProduct(slug);
  if (!product) notFound();

  return <FeaturedProductPage product={product} />;
}
