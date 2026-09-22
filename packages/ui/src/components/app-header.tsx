"use client";

import Link from "next/link";

import { cn } from "@walls/utils";

import { useAppHeaderVisible } from "./app-header-context";
import { KenooWordmark } from "./kenoo-wordmark";
import UserProfileButton, {
  type UserProfileButtonProps,
} from "./user-profile-button";

export interface AppHeaderProps extends UserProfileButtonProps {
  logoHref?: string;
  hidden?: boolean;
  className?: string;
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
}

export default function AppHeader({
  logoHref,
  hidden = false,
  leftContent,
  centerContent,
  className,
  dashboardPath = "/",
  ...profileProps
}: AppHeaderProps) {
  const homeHref = logoHref ?? dashboardPath;
  const headerVisible = useAppHeaderVisible();
  const isHidden = hidden || !headerVisible;

  const leading = leftContent ?? (
    <Link
      href={homeHref}
      className="flex items-center"
      aria-label="Kenoo home"
    >
      <KenooWordmark priority />
    </Link>
  );

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] flex h-16 items-center justify-between bg-kenoo-white px-4 transition-transform duration-300 sm:px-6",
        isHidden ? "-translate-y-full" : "translate-y-0",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{leading}</div>

      {centerContent ? (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden -translate-x-1/2 translate-y-0.5 items-center xl:flex">
          <div className="pointer-events-auto">{centerContent}</div>
        </div>
      ) : null}

      <UserProfileButton dashboardPath={dashboardPath} {...profileProps} />
    </header>
  );
}
