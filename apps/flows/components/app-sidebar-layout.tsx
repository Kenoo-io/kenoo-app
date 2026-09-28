"use client";

import type { ReactNode } from "react";
import { useAppHeaderVisible } from "@walls/ui/private-app-chrome";
import { cn } from "@walls/utils";

import { AppSidebar } from "./app-sidebar";
import { useAppSidebar } from "./app-sidebar-context";

export function AppSidebarLayout({ children, className }: { children: ReactNode; className?: string }) {
  const { isCollapsed } = useAppSidebar();
  const headerVisible = useAppHeaderVisible();
  return (
    <>
      <AppSidebar />
      <div className={cn("flex h-screen min-w-0 flex-col overflow-hidden bg-kenoo-white transition-[margin-left,padding-top] duration-300", headerVisible ? "pt-16" : "pt-0", !isCollapsed ? "md:ml-[13.25rem]" : "md:ml-[5.25rem]", className)}>
        <main data-app-scroll-container className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-none">{children}</main>
      </div>
    </>
  );
}
