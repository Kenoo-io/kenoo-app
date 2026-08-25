import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { createWallsMetadata } from "@walls/config/metadata";
import { AppSidebarLayout } from "@/components/app-sidebar-layout";
import { Providers } from "@/components/providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = createWallsMetadata({
  title: {
    default: "Platform",
    template: "%s | Platform",
  },
  description:
    "Kenoo Platform — API marketplace for keys, prepaid credits, and usage-based access to Kenoo products.",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-app="platform"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden bg-kenoo-white antialiased`}
    >
      <body className="h-screen overflow-hidden bg-kenoo-white text-neutral-900">
        <Providers>
          <AppSidebarLayout>{children}</AppSidebarLayout>
        </Providers>
      </body>
    </html>
  );
}
