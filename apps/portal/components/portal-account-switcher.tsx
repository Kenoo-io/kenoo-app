"use client";

import * as React from "react";
import { Building2, Check, ChevronDown, User } from "lucide-react";

import { cn } from "@walls/ui/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";

export type PortalAccountOption = {
  id: string;
  name: string;
  accountType: "personal" | "organization";
  iconUrl?: string | null;
};

type PortalAccountSwitcherProps = {
  accounts: PortalAccountOption[];
  activeAccountId: string | null;
  onAccountChange: (accountId: string) => void;
  loading?: boolean;
  userAvatarUrl?: string | null;
};

export function PortalAccountSwitcher({
  accounts,
  activeAccountId,
  onAccountChange,
  loading = false,
  userAvatarUrl = null,
}: PortalAccountSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);

  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

  if (accounts.length === 0) return null;

  const handleSelect = async (accountId: string) => {
    if (accountId === activeAccountId || switching) return;
    setSwitching(true);
    try {
      await onAccountChange(accountId);
      setOpen(false);
    } finally {
      setSwitching(false);
    }
  };

  if (loading && !activeAccount) {
    return (
      <div className="h-11 w-48 animate-pulse rounded-xl bg-kenoo-subtle" />
    );
  }

  if (!activeAccount) return null;

  if (accounts.length === 1) {
    return (
      <div className="flex min-w-0 max-w-[min(100vw-4rem,280px)] items-center gap-3 rounded-xl border border-kenoo-border bg-kenoo-surface px-3 py-2">
        <AccountAvatar
          account={activeAccount}
          userAvatarUrl={userAvatarUrl}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-kenoo-ink">
            {activeAccount.name}
          </span>
          <span className="block text-xs text-kenoo-muted">
            {activeAccount.accountType === "organization"
              ? "Organization"
              : "Personal"}
          </span>
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={switching || loading}
          className={cn(
            "flex min-w-0 max-w-[min(100vw-4rem,280px)] items-center gap-3 rounded-xl border border-kenoo-border bg-kenoo-surface px-3 py-2 text-left transition",
            "hover:border-kenoo-accent/30",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-kenoo-accent/30",
            "disabled:opacity-60",
          )}
        >
          <AccountAvatar
            account={activeAccount}
            userAvatarUrl={userAvatarUrl}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-kenoo-ink">
              {activeAccount.name}
            </span>
            <span className="block text-xs text-kenoo-muted">
              {activeAccount.accountType === "organization"
                ? "Organization"
                : "Personal"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-kenoo-muted transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="z-[110] w-[min(100vw-2rem,320px)] rounded-2xl border border-kenoo-border bg-kenoo-surface p-2 shadow-xl"
      >
        <p className="px-2 pb-1 pt-1 text-sm font-medium text-kenoo-muted">
          Choose an account
        </p>
        <div className="mt-1 space-y-0.5">
          {accounts.map((account) => {
            const isActive = account.id === activeAccount.id;
            return (
              <DropdownMenuItem
                key={account.id}
                onSelect={(event) => {
                  event.preventDefault();
                  void handleSelect(account.id);
                }}
                className={cn(
                  "cursor-pointer rounded-xl p-2 transition-colors focus:bg-transparent",
                  isActive ? "bg-kenoo-subtle" : "hover:bg-kenoo-subtle/70",
                )}
              >
                <div className="flex w-full items-center gap-3">
                  <AccountAvatar
                    account={account}
                    userAvatarUrl={userAvatarUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm text-kenoo-ink",
                        isActive ? "font-semibold" : "font-medium",
                      )}
                    >
                      {account.name}
                    </p>
                    <p className="mt-0.5 text-xs text-kenoo-muted">
                      {account.accountType === "organization"
                        ? "Organization"
                        : "Personal"}
                    </p>
                  </div>
                  {isActive ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-kenoo-ink"
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
  );
}

function AccountAvatar({
  account,
  userAvatarUrl,
}: {
  account: PortalAccountOption;
  userAvatarUrl?: string | null;
}) {
  const imageUrl =
    account.iconUrl ??
    (account.accountType === "personal" ? (userAvatarUrl ?? null) : null);

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote account icons
      <img
        src={imageUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-lg object-cover"
      />
    );
  }

  const Icon = account.accountType === "organization" ? Building2 : User;
  const initial = account.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-semibold",
        account.accountType === "organization"
          ? "bg-violet-100 text-violet-700"
          : "bg-neutral-100 text-neutral-600",
      )}
    >
      {account.accountType === "organization" ? (
        <Icon className="h-4 w-4" />
      ) : (
        <span className="text-sm">{initial}</span>
      )}
    </span>
  );
}
