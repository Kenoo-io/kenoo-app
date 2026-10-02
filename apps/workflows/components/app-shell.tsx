"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { AccountSwitcher } from "./account-switcher";
import { AppSidebarLayout } from "./app-sidebar-layout";
import { AppTopChrome } from "./app-top-chrome";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isWorkflowBuilder = pathname === "/workflows/new" || pathname.startsWith("/workflows/new/");
  const isEmailBuilder = pathname === "/templates/new/email" && searchParams.get("format") === "html";
  const isTemplateEditor = pathname.startsWith("/templates/") && !pathname.startsWith("/templates/new/");

  if (isWorkflowBuilder || isEmailBuilder || isTemplateEditor) return <div className="h-screen overflow-hidden">{children}</div>;

  return <>
    <AppTopChrome dashboardPath="/" leftContent={<AccountSwitcher />} />
    <AppSidebarLayout>{children}</AppSidebarLayout>
  </>;
}
