"use client";

import { usePathname } from "next/navigation";

import { AppSidebarLayout } from "@/components/app-sidebar-layout";

function isChromelessConsolePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.includes("/teams/") && pathname.endsWith("/create-member");
}

export function ConsoleLayoutClient({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  if (isChromelessConsolePath(pathname)) {
    return <div className="min-h-screen bg-kenoo-white">{children}</div>;
  }

  return <AppSidebarLayout>{children}</AppSidebarLayout>;
}
