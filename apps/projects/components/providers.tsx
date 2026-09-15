"use client";

import { AuthProvider } from "@walls/auth";

import { ActiveAccountProvider } from "./active-account-context";
import { AppSidebarProvider } from "./app-sidebar-context";
import { Toaster } from "./ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ActiveAccountProvider>
        <AppSidebarProvider>
          {children}
          <Toaster />
        </AppSidebarProvider>
      </ActiveAccountProvider>
    </AuthProvider>
  );
}
