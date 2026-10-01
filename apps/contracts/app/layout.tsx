import type { Metadata } from "next";

import { createWallsMetadata } from "@walls/config/metadata";

import "./globals.css";

export const metadata: Metadata = createWallsMetadata({
  title: { default: "Contracts", template: "%s | Contracts" },
  description: "WALLS Contracts — prepare, review, and send agreements for signature.",
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-app="contracts" className="h-full antialiased">
      <body className="h-screen overflow-hidden bg-[#fafafa] text-[#111111]">{children}</body>
    </html>
  );
}
