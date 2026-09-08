"use client";

import * as React from "react";
import { Building2, Check, ChevronDown, Plus, User } from "lucide-react";

import { resolveAppHref } from "@walls/auth";
import { cn } from "@walls/ui/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";

/** ~3.5 account rows (56px each) tall so a partial row hints at more to scroll. */
const ACCOUNT_LIST_MAX_HEIGHT = 204;

const ADMIN_APP_SLUG = process.env.NEXT_PUBLIC_ADMIN_APP_SLUG ?? "admin";
/** Organization creation lives on its own page in the admin console. */
const ADD_ORGANIZATION_URL = `${resolveAppHref({
  slug: ADMIN_APP_SLUG,
  subdomain: ADMIN_APP_SLUG,
  platformBase: "",
})}/account/new`;

export type PortalAccountOption = {
  id: string;
  name: string;
  accountType: "personal" | "organization";
  iconUrl?: string | null;
};

type PortalAccountSwitcherProps = {
  accounts: PortalAccountOption[];
  activeAccountId: string | null;
  onAccountChange: (accountId: string) => void | Promise<void>;
  loading?: boolean;
  userAvatarUrl?: string | null;
};

/** Matches the AdPilot / Projects header account switcher. */
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
      <div
        className="flex min-w-0 max-w-[min(100vw-4rem,280px)] items-center gap-3 rounded-xl bg-kenoo-white px-3 py-2.5"
        aria-busy="true"
        aria-label="Loading accounts"
      >
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-neutral-100" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-4 w-28 animate-pulse rounded bg-neutral-100" />
          <div className="h-3 w-16 animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (!activeAccount) return null;

  // Single linked account: show the account label without a switcher control.
  if (accounts.length < 2) {
    return (
      <div className="w-full max-w-[min(100vw-4rem,280px)] space-y-1.5">
        <div
          className="flex min-w-0 items-center gap-3 rounded-xl bg-kenoo-white px-3 py-2.5"
          aria-label={`Current account: ${activeAccount.name}`}
        >
          <div className="flex w-full items-center gap-3">
            <AccountAvatar account={activeAccount} userAvatarUrl={userAvatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-neutral-900">
                {activeAccount.name}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {activeAccount.accountType === "organization"
                  ? "Organization"
                  : "Personal"}
              </span>
            </span>
          </div>
        </div>
        <AddAccountLink />
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
            "flex min-w-0 max-w-[min(100vw-4rem,280px)] items-center gap-3 rounded-xl bg-kenoo-white px-3 py-2.5 text-left transition",
            "hover:bg-neutral-50",
            "focus:outline-none",
            "disabled:opacity-60",
            open && "bg-neutral-50",
          )}
        >
          <div className="flex w-full items-center gap-3">
            <AccountAvatar account={activeAccount} userAvatarUrl={userAvatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-neutral-900">
                {activeAccount.name}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {activeAccount.accountType === "organization"
                  ? "Organization"
                  : "Personal"}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-neutral-400 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="z-[110] flex w-[min(100vw-2rem,320px)] flex-col rounded-2xl border-0 bg-kenoo-white p-2 shadow-xl"
      >
        <p className="px-2 pb-1 pt-1 text-sm font-medium text-neutral-500">
          Choose an account
        </p>

        <div
          className="mt-1 space-y-0.5 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ maxHeight: ACCOUNT_LIST_MAX_HEIGHT }}
        >
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
                  isActive ? "bg-neutral-100" : "hover:bg-neutral-50",
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
                        "truncate text-sm text-neutral-900",
                        isActive ? "font-semibold" : "font-medium",
                      )}
                    >
                      {account.name}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {account.accountType === "organization"
                        ? "Organization"
                        : "Personal"}
                    </p>
                  </div>
                  {isActive ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-neutral-900"
                      strokeWidth={2.75}
                    />
                  ) : null}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <div className="mt-1 shrink-0 border-t border-neutral-100 pt-1">
          <DropdownMenuItem asChild className="cursor-pointer rounded-xl p-2 focus:bg-transparent">
            <a href={ADD_ORGANIZATION_URL} className="flex w-full items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-neutral-900">
                Add account
              </span>
            </a>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddAccountLink() {
  return (
    <a
      href={ADD_ORGANIZATION_URL}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-kenoo-white hover:text-neutral-900"
    >
      <Plus className="h-4 w-4 shrink-0" />
      Add account
    </a>
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
        className="h-10 w-10 shrink-0 rounded-lg object-cover"
      />
    );
  }

  const Icon = account.accountType === "organization" ? Building2 : User;
  const initial = account.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-semibold",
        account.accountType === "organization"
          ? "bg-violet-100 text-violet-700"
          : "bg-neutral-100 text-neutral-600",
      )}
    >
      {account.accountType === "organization" ? (
        <Icon className="h-5 w-5" />
      ) : (
        <span className="text-sm">{initial}</span>
      )}
    </span>
  );
}
