import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/kenoo/placeholder-page";

export const metadata: Metadata = {
  title: "Customers",
  description:
    "See how teams use Kenoo to run CRM, projects, calendar, finance, and AI in one place.",
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Customers"
      title="Teams that run on Kenoo."
      description="Content coming soon. Use this page for customer stories, logos, and case studies."
    />
  );
}
