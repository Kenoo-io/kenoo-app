import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/kenoo/placeholder-page";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Guides, docs, and updates to help you get more out of Kenoo.",
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Resources"
      title="Learn, build, and stay current."
      description="Content coming soon. Use this page for docs, guides, blog posts, changelogs, or help center links."
    />
  );
}
