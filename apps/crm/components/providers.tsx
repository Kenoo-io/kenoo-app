"use client";

import * as React from "react";
import { AuthProvider } from "@walls/auth";

import { ensureFirebaseClient } from "@/lib/firebase-client";

import { ActiveAccountProvider } from "./active-account-context";
import { AppSidebarProvider } from "./app-sidebar-context";

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    ensureFirebaseClient();
  }, []);

  return (
    <AuthProvider>
      <ActiveAccountProvider>
        <AppSidebarProvider>{children}</AppSidebarProvider>
      </ActiveAccountProvider>
    </AuthProvider>
  );
}
