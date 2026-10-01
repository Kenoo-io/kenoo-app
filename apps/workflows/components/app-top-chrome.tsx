"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { AppHeader, type AppHeaderProps } from "@walls/ui/private-app-chrome";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function AppTopChrome(props: AppHeaderProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!mounted) return null;
  return createPortal(<AppHeader {...props} />, document.body);
}
