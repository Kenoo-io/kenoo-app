import type { Metadata } from "next";

import ProductPage from "@/components/kenoo/product-page";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Explore Kenoo’s polished apps: AdPilot, CRM, Health, Projects, and Calendar.",
};

export default function Page() {
  return <ProductPage />;
}
