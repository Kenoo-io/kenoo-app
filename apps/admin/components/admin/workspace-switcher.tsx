"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
import { cn } from "@walls/utils";

import { useActiveAccount } from "@/components/active-account-context";

export function WorkspaceSwitcher() {
  const { accounts, activeAccountId, loading, setActiveAccountId } =
    useActiveAccount();

  const active =
    accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

  async function selectAccount(accountId: string) {
    const target = accounts.find((account) => account.id === accountId);
    if (!target || target.hasAppAccess === false || accountId === active?.id) {
      return;
    }
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    if (!response.ok) return;
    setActiveAccountId(accountId);
    window.location.reload();
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

  if (accounts.length < 2) {
    return (
      <div className="inline-flex max-w-full items-center gap-1 px-1 py-1">
        {label}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={active.name}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-md px-1 py-1 text-left",
            "hover:bg-black/[0.04]",
          )}
        >
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[80] w-[240px] rounded-xl border border-neutral-200 bg-kenoo-white p-1 shadow-lg"
      >
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
              className="cursor-pointer rounded-lg px-2 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {account.name}
                </span>
                <span className="block text-[11px] text-neutral-400">
                  {!hasAppAccess
                    ? "No Admin access"
                    : account.accountType === "organization"
                      ? "Organization"
                      : "Personal"}
                </span>
              </span>
              {isActive ? (
                <Check className="h-3.5 w-3.5 text-neutral-900" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
