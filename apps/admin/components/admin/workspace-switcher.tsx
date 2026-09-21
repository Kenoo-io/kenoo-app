"use client";

import * as React from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";

import { useAuth } from "@walls/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
import { cn } from "@walls/utils";

import {
  type AdminAccountOption,
  useActiveAccount,
} from "@/components/active-account-context";

/** Organization creation lives on its own page in the admin console. */
const ADD_ORGANIZATION_URL = "/account/new";

export function WorkspaceSwitcher() {
  const { accounts, activeAccountId, loading, setActiveAccountId } =
    useActiveAccount();
  const [open, setOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);

  const active =
    accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

  async function selectAccount(accountId: string) {
    const target = accounts.find((account) => account.id === accountId);
    if (
      !target ||
      target.hasAppAccess === false ||
      accountId === active?.id ||
      switching
    ) {
      return;
    }
    setSwitching(true);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (!response.ok) {
        setSwitching(false);
        return;
      }
      setActiveAccountId(accountId);
      setOpen(false);
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  if (loading) {
    return <div className="h-6 w-28 rounded bg-black/[0.04]" />;
  }

  if (!active) {
    return (
      <span className="px-1 text-[14px] font-semibold text-neutral-400">
        No workspace
      </span>
    );
  }

  const label = (
    <>
      <span className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.01em] text-neutral-950">
        {active.name}
      </span>
      <ChevronsUpDown
        className="h-3.5 w-3.5 shrink-0 text-neutral-400"
        strokeWidth={2}
      />
    </>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={active.name}
          disabled={switching}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-md px-1 py-1 text-left",
            "hover:bg-black/[0.04]",
            "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
            "disabled:opacity-60",
          )}
        >
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="z-[80] w-[min(100vw-2rem,320px)] rounded-2xl border-0 bg-kenoo-white p-2 shadow-xl"
      >
        <p className="px-2 pb-1 pt-1 text-sm font-medium text-neutral-500">
          Choose an account
        </p>

        <div className="mt-1 space-y-0.5">
          {accounts.map((account) => {
            const isActive = account.id === active.id;
            const hasAppAccess = account.hasAppAccess !== false;
            return (
              <DropdownMenuItem
                key={account.id}
                disabled={!hasAppAccess}
                onSelect={(event) => {
                  event.preventDefault();
                  if (!hasAppAccess) return;
                  void selectAccount(account.id);
                }}
                className={cn(
                  "rounded-xl p-2 transition-colors focus:bg-transparent",
                  hasAppAccess
                    ? cn(
                        "cursor-pointer",
                        isActive ? "bg-neutral-100" : "hover:bg-neutral-50",
                      )
                    : "cursor-not-allowed opacity-50 data-[disabled]:opacity-50",
                )}
                title={
                  hasAppAccess
                    ? undefined
                    : "This account does not have access to Admin"
                }
              >
                <div className="flex w-full items-center gap-3">
                  <AccountAvatar account={account} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm text-foreground",
                        isActive ? "font-semibold" : "font-medium",
                        !hasAppAccess && "text-neutral-500",
                      )}
                    >
                      {account.name}
                    </p>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs",
                        hasAppAccess ? "text-neutral-500" : "text-neutral-400",
                      )}
                    >
                      {hasAppAccess
                        ? account.accountType === "organization"
                          ? "Organization"
                          : "Account"
                        : "No Admin access"}
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

        <div className="mt-2 border-t border-neutral-100 pt-2">
          <DropdownMenuItem
            asChild
            className="cursor-pointer rounded-xl p-2 transition-colors focus:bg-neutral-50"
          >
            <a
              href={ADD_ORGANIZATION_URL}
              className="flex w-full items-center gap-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-foreground">
                Add account
              </span>
            </a>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountAvatar({ account }: { account: AdminAccountOption }) {
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
        className="h-10 w-10 shrink-0 rounded-lg object-cover"
      />
    );
  }

  const isOrganization = account.accountType === "organization";
  const initial = account.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-semibold",
        isOrganization
          ? "bg-violet-100 text-violet-700"
          : "bg-neutral-100 text-neutral-600",
      )}
    >
      {isOrganization ? (
        <Building2 className="h-5 w-5" />
      ) : (
        <span className="text-sm">{initial}</span>
      )}
    </span>
  );
}
