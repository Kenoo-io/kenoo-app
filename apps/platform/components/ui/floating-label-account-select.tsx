"use client";

import * as React from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@walls/auth";
import { kenooColors } from "@walls/ui/colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
import { cn } from "@walls/utils";

import type { PlatformAccount } from "@/lib/account-types";

const NEUTRAL_200 = "#e5e5e5";
const NEUTRAL_400 = "#a3a3a3";
const NEUTRAL_500 = "#737373";
const KENOO_SKY = kenooColors.sky.DEFAULT;

const POSITION_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.6,
};

const COLOR_TRANSITION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function canManageKeysForAccount(account: PlatformAccount): boolean {
  return ["owner", "admin"].includes(account.role.toLowerCase());
}

export function FloatingLabelAccountSelect({
  label,
  accounts,
  value,
  onChange,
  loading = false,
  disabled = false,
  containerClassName,
}: {
  label: string;
  accounts: PlatformAccount[];
  value: string | null;
  onChange: (accountId: string) => void;
  loading?: boolean;
  disabled?: boolean;
  containerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const generatedId = React.useId();

  const selected =
    accounts.find((account) => account.id === value) ?? accounts[0] ?? null;
  const floated = open || Boolean(selected) || loading;
  const accentColor = open ? KENOO_SKY : floated ? NEUTRAL_500 : NEUTRAL_400;
  const canSwitch = accounts.length > 1 && !disabled && !loading;

  return (
    <div className={cn("pt-2", containerClassName)}>
      <DropdownMenu
        open={canSwitch ? open : false}
        onOpenChange={(next) => {
          if (!canSwitch) return;
          setOpen(next);
        }}
      >
        <div className="relative">
          <DropdownMenuTrigger asChild>
            <motion.button
              type="button"
              id={generatedId}
              disabled={!canSwitch}
              aria-label={label}
              className={cn(
                "flex h-12 w-full items-center gap-3 rounded-2xl border bg-kenoo-white px-3 text-left outline-none",
                "focus:outline-none focus-visible:outline-none",
                "disabled:cursor-default",
              )}
              initial={false}
              animate={{
                borderColor: open ? KENOO_SKY : NEUTRAL_200,
              }}
              transition={COLOR_TRANSITION}
            >
              {loading || !selected ? (
                <span className="h-8 w-8 shrink-0 rounded-md bg-neutral-100" />
              ) : (
                <AccountAvatar account={selected} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-light leading-none text-foreground">
                  {loading ? "Loading…" : selected?.name ?? "Select a project"}
                </span>
              </span>
              {accounts.length > 1 ? (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-neutral-400 transition-transform",
                    open && "rotate-180",
                  )}
                />
              ) : null}
            </motion.button>
          </DropdownMenuTrigger>
          <motion.label
            htmlFor={generatedId}
            className={cn(
              "pointer-events-none absolute left-3 flex origin-left items-center px-1.5 font-light",
              floated ? "bg-kenoo-white" : "bg-transparent",
            )}
            initial={false}
            animate={{
              top: floated ? 0 : "50%",
              y: "-50%",
              scale: floated ? 0.78 : 1,
              color: accentColor,
            }}
            transition={{
              top: POSITION_TRANSITION,
              y: POSITION_TRANSITION,
              scale: POSITION_TRANSITION,
              color: COLOR_TRANSITION,
            }}
          >
            <span className="text-sm leading-none">{label}</span>
          </motion.label>
        </div>

        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="z-[80] w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl border-0 bg-kenoo-white p-2 shadow-xl"
        >
          <p className="px-2 pb-1 pt-1 text-sm font-medium text-neutral-500">
            Choose a project
          </p>
          <div className="mt-1 space-y-0.5">
            {accounts.map((account) => {
              const isActive = account.id === selected?.id;
              return (
                <DropdownMenuItem
                  key={account.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    onChange(account.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl p-2 transition-colors focus:bg-transparent",
                    isActive ? "bg-neutral-100" : "hover:bg-neutral-50",
                  )}
                >
                  <div className="flex w-full items-center gap-3">
                    <AccountAvatar account={account} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm text-foreground",
                          isActive ? "font-semibold" : "font-medium",
                        )}
                      >
                        {account.name}
                      </p>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {account.accountType === "organization"
                          ? "Organization"
                          : "Account"}
                      </span>
                    </div>
                    {isActive ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-foreground"
                        strokeWidth={2.75}
                      />
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AccountAvatar({ account }: { account: PlatformAccount }) {
  const { profile } = useAuth();
  const imageUrl =
    account.iconUrl ??
    (account.accountType === "personal" ? (profile?.avatarUrl ?? null) : null);

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote account icons
      <img
        src={imageUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-md object-cover"
      />
    );
  }

  if (account.accountType === "organization") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
        <Building2 className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-sm font-semibold text-neutral-600">
      {account.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
