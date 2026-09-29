"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AccountSwitcher } from "./account-switcher";
import { AppSidebarLayout } from "./app-sidebar-layout";
import { AppTopChrome } from "./app-top-chrome";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFlowBuilder = pathname === "/flows/new" || pathname.startsWith("/flows/new/");

  if (isFlowBuilder) return <div className="h-screen overflow-hidden">{children}</div>;

  return <>
    <AppTopChrome dashboardPath="/" leftContent={<AccountSwitcher />} />
    <AppSidebarLayout>{children}</AppSidebarLayout>
  </>;
}
