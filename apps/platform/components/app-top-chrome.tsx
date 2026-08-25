"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  AppHeader,
  type AppHeaderProps,
} from "@walls/ui/private-app-chrome";

export function AppTopChrome(props: AppHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(<AppHeader {...props} />, document.body);
}
