"use client";

import * as React from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@walls/auth";
import { kenooColors } from "@walls/ui/colors";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@walls/ui/dropdown-menu";
import { cn } from "@walls/utils";

export type WorkflowAccount = {
  id: string;
  name: string;
  accountType: "personal" | "organization";
  iconUrl: string | null;
  role: string;
  hasAppAccess?: boolean;
};

export function canManageWorkflowKeys(account: WorkflowAccount | null): boolean {
  return Boolean(account && ["owner", "admin"].includes(account.role.toLowerCase()));
}

export function FloatingLabelAccountSelect({
  accounts,
  value,
  onChange,
  loading = false,
  disabled = false,
}: {
  accounts: WorkflowAccount[];
  value: string | null;
  onChange: (accountId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const generatedId = React.useId();
  const { profile } = useAuth();
  const selected = accounts.find((account) => account.id === value) ?? accounts[0] ?? null;
  const floated = open || Boolean(selected) || loading;
  const accentColor = open ? kenooColors.sky.DEFAULT : floated ? "#737373" : "#a3a3a3";
  const canSwitch = accounts.length > 1 && !disabled && !loading;

  return (
    <div className="pt-6">
      <DropdownMenu open={canSwitch ? open : false} onOpenChange={(next) => { if (canSwitch) setOpen(next); }}>
        <div className="relative">
          <DropdownMenuTrigger asChild>
            <motion.button type="button" id={generatedId} disabled={!canSwitch} aria-label="Project" className="flex h-12 w-full items-center gap-3 rounded-2xl border bg-kenoo-white px-3 text-left outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default" initial={false} animate={{ borderColor: open ? kenooColors.sky.DEFAULT : "#e5e5e5" }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              {loading || !selected ? <span className="h-8 w-8 shrink-0 rounded-md bg-neutral-100" /> : <AccountAvatar account={selected} profileAvatar={profile?.avatarUrl ?? null} />}
              <span className="min-w-0 flex-1 truncate text-sm font-light leading-none text-foreground">{loading ? "Loading…" : selected?.name ?? "Select a project"}</span>
              {accounts.length > 1 ? <ChevronDown className={cn("h-4 w-4 shrink-0 text-neutral-400 transition-transform", open && "rotate-180")} /> : null}
            </motion.button>
          </DropdownMenuTrigger>
          <motion.label htmlFor={generatedId} className={cn("pointer-events-none absolute left-3 flex origin-left items-center px-1.5 font-light", floated ? "bg-kenoo-white" : "bg-transparent")} initial={false} animate={{ top: floated ? 0 : "50%", y: "-50%", scale: floated ? 0.78 : 1, color: accentColor }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            <span className="text-sm leading-none">Project</span>
          </motion.label>
        </div>
        <DropdownMenuContent align="start" sideOffset={8} className="z-[240] w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl border-0 bg-kenoo-white p-2 shadow-xl">
          <p className="px-2 pb-1 pt-1 text-sm font-medium text-neutral-500">Choose a project</p>
          <div className="mt-1 space-y-0.5">
            {accounts.map((account) => {
              const isActive = account.id === selected?.id;
              return <DropdownMenuItem key={account.id} disabled={account.hasAppAccess === false} onSelect={(event) => { event.preventDefault(); if (account.hasAppAccess !== false) { onChange(account.id); setOpen(false); } }} className={cn("rounded-xl p-2 transition-colors focus:bg-transparent", isActive ? "bg-neutral-100" : "hover:bg-neutral-50", account.hasAppAccess === false && "cursor-not-allowed opacity-50")}><div className="flex w-full items-center gap-3"><AccountAvatar account={account} profileAvatar={profile?.avatarUrl ?? null} /><div className="min-w-0 flex-1"><p className={cn("truncate text-sm text-foreground", isActive ? "font-semibold" : "font-medium")}>{account.name}</p><span className="mt-0.5 block text-xs text-neutral-500">{account.hasAppAccess === false ? "No Workflows access" : account.accountType === "organization" ? "Organization" : "Account"}</span></div>{isActive ? <Check className="h-4 w-4 shrink-0 text-foreground" strokeWidth={2.75} /> : null}</div></DropdownMenuItem>;
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AccountAvatar({ account, profileAvatar }: { account: WorkflowAccount; profileAvatar: string | null }) {
  const imageUrl = account.iconUrl ?? (account.accountType === "personal" ? profileAvatar : null);
  if (imageUrl) return <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />; // eslint-disable-line @next/next/no-img-element -- account icon URLs are user-configured
  if (account.accountType === "organization") return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700"><Building2 className="h-4 w-4" /></span>;
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-sm font-semibold text-neutral-600">{account.name.trim().charAt(0).toUpperCase() || "?"}</span>;
}
