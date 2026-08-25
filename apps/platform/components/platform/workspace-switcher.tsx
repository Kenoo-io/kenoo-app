"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
import { cn } from "@walls/utils";

import type { PlatformAccount } from "@/lib/account-types";

export function WorkspaceSwitcher() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/accounts")
      .then(async (response) => {
        const payload = (await response.json()) as {
          accounts?: PlatformAccount[];
          activeAccountId?: string | null;
        };
        if (cancelled || !response.ok) return;
        setAccounts(payload.accounts ?? []);
        setActiveAccountId(payload.activeAccountId ?? null);
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active =
    accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

  async function selectAccount(accountId: string) {
    if (accountId === active?.id || switching) return;
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
      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
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
          disabled={switching}
          title={active.name}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-md px-1 py-1 text-left",
            "hover:bg-black/[0.04] disabled:opacity-60",
          )}
        >
          {label}
        </button>
      </DropdownMenuTrigger>
      <AccountMenu
        accounts={accounts}
        activeId={active.id}
        onSelect={selectAccount}
      />
    </DropdownMenu>
  );
}

function AccountMenu({
  accounts,
  activeId,
  onSelect,
}: {
  accounts: PlatformAccount[];
  activeId: string;
  onSelect: (accountId: string) => void;
}) {
  return (
    <DropdownMenuContent
      align="start"
      className="z-[80] w-[240px] rounded-xl border border-neutral-200 bg-kenoo-white p-1 shadow-lg"
    >
      {accounts.map((account) => {
        const isActive = account.id === activeId;
        return (
          <DropdownMenuItem
            key={account.id}
            onSelect={(event) => {
              event.preventDefault();
              onSelect(account.id);
            }}
            className="cursor-pointer rounded-lg px-2 py-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">
                {account.name}
              </span>
              <span className="block text-[11px] text-neutral-400">
                {account.accountType === "organization"
                  ? "Organization"
                  : "Personal"}
              </span>
            </span>
            {isActive ? <Check className="h-3.5 w-3.5 text-neutral-900" /> : null}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuContent>
  );
}
