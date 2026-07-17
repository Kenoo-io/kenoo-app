import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/kenoo/placeholder-page";

export const metadata: Metadata = {
  title: "Solutions",
  description:
    "Explore how Kenoo fits different teams and workflows across your business.",
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Solutions"
      title="Built for the way your team works."
      description="Content coming soon. Use this page for industry or team-based solutions — sales, operations, finance, and more."
    />
  );
}
