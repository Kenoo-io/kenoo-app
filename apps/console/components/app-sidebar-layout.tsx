"use client";

import { cn } from "@walls/utils";

import { AppSidebar } from "./app-sidebar";
import { useAppSidebar } from "./app-sidebar-context";

type AppSidebarLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppSidebarLayout({ children, className }: AppSidebarLayoutProps) {
  const { isCollapsed } = useAppSidebar();

  return (
    <>
      <AppSidebar />
      <div
        className={cn(
          "flex h-screen min-w-0 flex-col bg-kenoo-white pt-12 transition-[margin-left] duration-200 md:pt-0 print:ml-0 print:h-auto print:pt-0",
          isCollapsed ? "md:ml-[68px]" : "md:ml-[248px]",
          className,
        )}
      >
        <main
          data-app-scroll-container
          className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-none px-6 pb-8 pt-6 md:px-10 md:pt-8 print:h-auto print:overflow-visible print:px-0 print:py-0"
        >
          {children}
        </main>
      </div>
    </>
  );
}
