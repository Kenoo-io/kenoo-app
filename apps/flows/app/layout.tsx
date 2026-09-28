import type { Metadata } from "next";

import { createWallsMetadata } from "@walls/config/metadata";
import { AppHeaderVisibilityProvider } from "@walls/ui/private-app-chrome";

import { AppSidebarLayout } from "@/components/app-sidebar-layout";
import { AppTopChrome } from "@/components/app-top-chrome";
import { AccountSwitcher } from "@/components/account-switcher";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = createWallsMetadata({
  title: { default: "Flows", template: "%s | Flows" },
  description: "Kenoo Flows — intelligent customer journeys and email automations.",
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
  },
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-app="flows" className="h-full antialiased">
      <body className="h-screen overflow-hidden bg-kenoo-white text-[#111111]">
        <Providers>
          <AppHeaderVisibilityProvider autoHideOnScroll>
            <AppTopChrome dashboardPath="/" leftContent={<AccountSwitcher />} />
            <AppSidebarLayout>{children}</AppSidebarLayout>
          </AppHeaderVisibilityProvider>
        </Providers>
      </body>
    </html>
  );
}
