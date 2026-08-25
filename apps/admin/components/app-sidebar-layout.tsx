"use client";

import { cn } from "@walls/utils";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAppSidebar } from "@/components/app-sidebar-context";

type AppSidebarLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppSidebarLayout({ children, className }: AppSidebarLayoutProps) {
  const { isCollapsed } = useAppSidebar();

  return (
    <>
      <AdminSidebar />
      <div
        className={cn(
          "flex h-screen min-w-0 flex-col bg-kenoo-white pt-12 transition-[margin-left] duration-200 md:pt-0",
          isCollapsed ? "md:ml-[68px]" : "md:ml-[248px]",
          className,
        )}
      >
        <main
          data-app-scroll-container
          className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-none"
        >
          {children}
        </main>
      </div>
    </>
  );
}
