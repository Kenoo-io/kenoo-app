import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { createWallsMetadata } from "@walls/config/metadata";
import { ConsoleLayoutClient } from "@/components/console/console-layout-client";
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
    default: "Console",
    template: "%s | Kenoo Console",
  },
  description:
    "Internal Kenoo super-admin — system-wide users, apps, jobs, and teams.",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-app="console"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden bg-kenoo-white antialiased`}
    >
      <body className="h-screen overflow-hidden bg-kenoo-white text-neutral-900">
        <Providers>
          <ConsoleLayoutClient>{children}</ConsoleLayoutClient>
        </Providers>
      </body>
    </html>
  );
}
