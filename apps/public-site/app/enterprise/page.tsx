import type { Metadata } from "next";

import EnterprisePage from "@/components/kenoo/enterprise-page";

export const metadata: Metadata = {
  title: "Enterprise",
  description:
    "Kenoo for larger teams — security, scale, and support built for enterprise operations. Submit an enterprise inquiry.",
};

export default function Page() {
  return <EnterprisePage />;
}
