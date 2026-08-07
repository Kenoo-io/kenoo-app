import type { Metadata } from "next";

import ProductPage from "@/components/kenoo/product-page";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Explore Kenoo’s polished apps (AdPilot, CRM, and Health), plus the business, finance, and health angles of the suite.",
};

export default function Page() {
  return <ProductPage />;
}
