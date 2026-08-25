"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  FileText,
  Info,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@walls/ui/button";
import { Input } from "@walls/ui/input";
import { LabeledSwitch } from "@walls/ui/switch";
import { cn } from "@walls/utils";

import type { PlatformAccountMember } from "@/lib/account-types";
import { formatUsdFromCents } from "@/lib/money";

const TOPUP_AMOUNTS = [1000, 2500, 5000, 10000, 25000];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "payment-methods", label: "Payment methods" },
  { id: "billing-history", label: "Billing history" },
  { id: "members", label: "Members" },
  { id: "preferences", label: "Preferences" },
  { id: "promotions", label: "Promotions" },
] as const;

type BillingTab = (typeof TABS)[number]["id"];

type WalletState = {
  balance_cents: number;
  auto_topup_enabled: boolean;
  auto_topup_threshold_cents: number;
  auto_topup_amount_cents: number;
  has_card: boolean;
};

export type LedgerRow = {
  id: string;
  created_at: string;
  entry_type: string;
  amount_cents: number;
};

export function BillingPanel({
  wallet,
  workspaceName,
  canManageBilling,
  canEditBudget,
  ledger,
  members,
  currentUserId,
}: {
  wallet: WalletState;
  workspaceName: string;
  canManageBilling: boolean;
  canEditBudget: boolean;
  ledger: LedgerRow[];
  members: PlatformAccountMember[];
  currentUserId: string | null;
}) {
  const [tab, setTab] = useState<BillingTab>("overview");
  const [state, setState] = useState(wallet);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [threshold, setThreshold] = useState(
    String(wallet.auto_topup_threshold_cents / 100),
  );
  const [amount, setAmount] = useState(
    String(wallet.auto_topup_amount_cents / 100),
  );

  async function startCheckout(kind: "topup" | "setup_card", amountCents?: number) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, amountCents }),
      });
      const payload = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout failed");
      }
      window.location.assign(payload.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout failed");
      setPending(false);
    }
  }

  async function saveAutoTopup(enabled: boolean) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/auto-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          thresholdCents: Math.round(Number(threshold) * 100),
          amountCents: Math.round(Number(amount) * 100),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        settings?: {
          auto_topup_enabled: boolean;
          auto_topup_threshold_cents: number;
          auto_topup_amount_cents: number;
        };
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save auto top-up");
      }
      if (payload.settings) {
        setState((current) => ({ ...current, ...payload.settings }));
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to save auto top-up",
      );
    } finally {
      setPending(false);
    }
  }

  const autoReloadCopy = useMemo(() => {
    const floor = formatUsdFromCents(state.auto_topup_threshold_cents);
    const reload = formatUsdFromCents(state.auto_topup_amount_cents);
    if (!state.has_card) {
      return "Add a payment method to reload credits automatically when the balance runs low.";
    }
    if (!state.auto_topup_enabled) {
      return `Auto-reload is off. When enabled, credits reload by ${reload} once the balance reaches ${floor}.`;
    }
    return `When my balance reaches ${floor}, reload it by ${reload}.`;
  }, [
    state.auto_topup_amount_cents,
    state.auto_topup_enabled,
    state.auto_topup_threshold_cents,
    state.has_card,
  ]);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <h1 className="text-[32px] font-semibold tracking-tight text-neutral-950">
        Billing
      </h1>

      <nav
        className="mt-6 flex gap-5 overflow-x-auto border-b border-neutral-200"
        aria-label="Billing sections"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 pb-2.5 text-[13px] font-medium transition-colors",
              tab === item.id
                ? "border-neutral-950 text-neutral-950"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="pt-8">
        {tab === "overview" ? (
          <OverviewTab
            balanceCents={state.balance_cents}
            autoEnabled={state.auto_topup_enabled && state.has_card}
            autoCopy={autoReloadCopy}
            canManageBilling={canManageBilling}
            pending={pending}
            onBuy={() => setBuyOpen(true)}
            onCancelPlan={() => setCancelOpen(true)}
            onManageAutoReload={() => setTab("preferences")}
            onOpenPaymentMethods={() => setTab("payment-methods")}
            onOpenHistory={() => setTab("billing-history")}
            onOpenPreferences={() => setTab("preferences")}
          />
        ) : null}

        {tab === "payment-methods" ? (
          <PaymentMethodsTab
            hasCard={state.has_card}
            workspaceName={workspaceName}
            canManageBilling={canManageBilling}
            pending={pending}
            onSetupCard={() => startCheckout("setup_card")}
          />
        ) : null}

        {tab === "billing-history" ? <HistoryTab rows={ledger} /> : null}

        {tab === "members" ? (
          <MembersTab
            members={members}
            workspaceName={workspaceName}
            currentUserId={currentUserId}
          />
        ) : null}

        {tab === "preferences" ? (
          <PreferencesTab
            hasCard={state.has_card}
            enabled={state.auto_topup_enabled}
            threshold={threshold}
            amount={amount}
            pending={pending}
            canEditBudget={canEditBudget}
            canManageBilling={canManageBilling}
            onThreshold={setThreshold}
            onAmount={setAmount}
            onToggle={(checked) => saveAutoTopup(checked)}
            onSave={() => saveAutoTopup(state.auto_topup_enabled)}
            onSetupCard={() => startCheckout("setup_card")}
          />
        ) : null}

        {tab === "promotions" ? (
          <EmptyTab
            title="Promotions"
            body="There are no billing promotions available for this workspace right now."
          />
        ) : null}
      </div>

      {buyOpen ? (
        <BuyCreditsDialog
          pending={pending}
          canManageBilling={canManageBilling}
          onClose={() => setBuyOpen(false)}
          onBuy={(cents) => startCheckout("topup", cents)}
        />
      ) : null}

      {cancelOpen ? (
        <SimpleDialog
          title="Pay as you go"
          body="This workspace has no subscription. Credits are prepaid, and you can stop buying more at any time. Auto-reload can be turned off in Preferences."
          onClose={() => setCancelOpen(false)}
        />
      ) : null}
    </div>
  );
}

function OverviewTab({
  balanceCents,
  autoEnabled,
  autoCopy,
  canManageBilling,
  pending,
  onBuy,
  onCancelPlan,
  onManageAutoReload,
  onOpenPaymentMethods,
  onOpenHistory,
  onOpenPreferences,
}: {
  balanceCents: number;
  autoEnabled: boolean;
  autoCopy: string;
  canManageBilling: boolean;
  pending: boolean;
  onBuy: () => void;
  onCancelPlan: () => void;
  onManageAutoReload: () => void;
  onOpenPaymentMethods: () => void;
  onOpenHistory: () => void;
  onOpenPreferences: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-950">Pay as you go</h2>

      <div className="mt-6 flex items-center gap-1.5 text-[13px] text-neutral-500">
        <span>API credit balance</span>
        <span
          className="inline-flex text-neutral-400"
          title="Prepaid credits billed per API request for this Kenoo workspace."
        >
          <Info className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1 text-[44px] font-semibold leading-none tracking-tight text-neutral-950">
        {formatUsdFromCents(balanceCents)}
      </p>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-neutral-200 px-4 py-4 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-neutral-950">
              Auto-reload credits
            </p>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                autoEnabled
                  ? "bg-emerald-500 text-kenoo-white"
                  : "bg-neutral-100 text-neutral-500",
              )}
            >
              {autoEnabled ? "ON" : "OFF"}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-5 text-neutral-500">
            {autoCopy}
          </p>
        </div>
        <button
          type="button"
          onClick={onManageAutoReload}
          className="shrink-0 rounded-lg bg-neutral-100 px-3 py-2 text-[13px] font-medium text-neutral-800 hover:bg-neutral-200"
        >
          Manage auto-reload
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || !canManageBilling}
          className="h-10 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-kenoo-white hover:bg-neutral-800"
          onClick={onBuy}
        >
          Buy credits
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          className="h-10 rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-900 shadow-none hover:bg-neutral-200"
          onClick={onCancelPlan}
        >
          Cancel plan
        </Button>
      </div>
      {!canManageBilling ? (
        <p className="mt-3 text-[13px] text-neutral-400">
          Owners and admins can buy credits and change the card on file.
        </p>
      ) : null}

      <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        <MenuLink
          icon={CreditCard}
          title="Payment methods"
          description="Add or change payment method"
          onClick={onOpenPaymentMethods}
        />
        <MenuLink
          icon={FileText}
          title="Billing history"
          description="View past credits and charges"
          onClick={onOpenHistory}
        />
        <MenuLink
          icon={Settings}
          title="Preferences"
          description="Manage billing information"
          onClick={onOpenPreferences}
          chevron
        />
        <Link
          href="/limits"
          className="flex items-start gap-3 rounded-lg py-1 text-left hover:opacity-80"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-medium text-neutral-950">
              Usage limits
            </span>
            <span className="mt-0.5 block text-[13px] text-neutral-500">
              Set monthly spend limits
            </span>
          </span>
        </Link>
        <Link
          href="/docs"
          className="flex items-start gap-3 rounded-lg py-1 text-left hover:opacity-80"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-medium text-neutral-950">
              Pricing
            </span>
            <span className="mt-0.5 block text-[13px] text-neutral-500">
              View pricing and product docs
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function MenuLink({
  icon: Icon,
  title,
  description,
  onClick,
  chevron,
}: {
  icon: typeof CreditCard;
  title: string;
  description: string;
  onClick: () => void;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg py-1 text-left hover:opacity-80"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="flex items-center gap-1 text-sm font-medium text-neutral-950">
          {title}
          {chevron ? <span className="text-neutral-400">›</span> : null}
        </span>
        <span className="mt-0.5 block text-[13px] text-neutral-500">
          {description}
        </span>
      </span>
    </button>
  );
}

function PaymentMethodsTab({
  hasCard,
  workspaceName,
  canManageBilling,
  pending,
  onSetupCard,
}: {
  hasCard: boolean;
  workspaceName: string;
  canManageBilling: boolean;
  pending: boolean;
  onSetupCard: () => void;
}) {
  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-neutral-950">Payment methods</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Cards are saved to {workspaceName} for auto-reload and credit purchases.
      </p>
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
          <CreditCard className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-950">
            {hasCard ? "Card on file" : "No payment method"}
          </p>
          <p className="text-[13px] text-neutral-500">
            {hasCard
              ? "A card is saved for auto-reload and future charges."
              : "Add a card to buy credits and enable auto-reload."}
          </p>
        </div>
        <Button
          type="button"
          className="rounded-lg"
          disabled={pending || !canManageBilling}
          onClick={onSetupCard}
        >
          {hasCard ? "Replace card" : "Add card"}
        </Button>
      </div>
      {!canManageBilling ? (
        <p className="mt-3 text-[13px] text-neutral-400">
          Only owners and admins can add or replace the card on file.
        </p>
      ) : null}
    </div>
  );
}

function HistoryTab({ rows }: { rows: LedgerRow[] }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-950">Billing history</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Credit purchases, auto-reloads, and usage charges for this workspace.
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200">
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-neutral-500">
            No billing activity yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-100 text-xs text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-50 last:border-0"
                >
                  <td className="px-4 py-3 text-neutral-600">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium capitalize text-neutral-900">
                    {row.entry_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-700">
                    {row.amount_cents < 0 ? "−" : ""}
                    {formatUsdFromCents(Math.abs(row.amount_cents))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MembersTab({
  members,
  workspaceName,
  currentUserId,
}: {
  members: PlatformAccountMember[];
  workspaceName: string;
  currentUserId: string | null;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-950">Members</h2>
      <p className="mt-1 text-sm text-neutral-500">
        People with access to {workspaceName}. Organization workspaces can
        include multiple users on the same bill.
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200">
        {members.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-neutral-500">
            No members found for this workspace.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {members.map((member) => {
              const displayName =
                `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
                member.email;
              const initials = memberInitials(displayName, member.email);
              const isYou = currentUserId === member.userId;
              return (
                <li
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700">
                      {initials}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-950">
                      {displayName}
                      {isYou ? (
                        <span className="ml-1.5 text-[12px] font-normal text-neutral-400">
                          You
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[13px] text-neutral-500">
                      {member.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-600">
                    {member.role.replace(/_/g, " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function memberInitials(name: string, email: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  const source = parts[0] || email;
  return source.slice(0, 2).toUpperCase();
}

function PreferencesTab({
  hasCard,
  enabled,
  threshold,
  amount,
  pending,
  canEditBudget,
  canManageBilling,
  onThreshold,
  onAmount,
  onToggle,
  onSave,
  onSetupCard,
}: {
  hasCard: boolean;
  enabled: boolean;
  threshold: string;
  amount: string;
  pending: boolean;
  canEditBudget: boolean;
  canManageBilling: boolean;
  onThreshold: (value: string) => void;
  onAmount: (value: string) => void;
  onToggle: (checked: boolean) => void;
  onSave: () => void;
  onSetupCard: () => void;
}) {
  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-neutral-950">Preferences</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Auto-reload charges the card on file when credits run low.
        </p>
      </div>

      {!hasCard ? (
        <div className="rounded-xl border border-neutral-200 px-4 py-4">
          <p className="text-sm text-neutral-600">
            Save a payment method before turning on auto-reload.
          </p>
          <Button
            type="button"
            className="mt-3 rounded-lg"
            disabled={pending || !canManageBilling}
            onClick={onSetupCard}
          >
            Add card
          </Button>
        </div>
      ) : null}

      <LabeledSwitch
        label="Auto-reload credits"
        description="Charge the saved card when the balance reaches your threshold."
        checked={enabled}
        disabled={pending || !hasCard || !canEditBudget}
        onCheckedChange={onToggle}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-neutral-500">
          Threshold (USD)
          <Input
            type="number"
            min="1"
            step="1"
            value={threshold}
            disabled={!canEditBudget}
            onChange={(event) => onThreshold(event.target.value)}
            className="mt-1 rounded-lg"
          />
        </label>
        <label className="text-xs text-neutral-500">
          Reload amount (USD)
          <Input
            type="number"
            min="10"
            step="1"
            value={amount}
            disabled={!canEditBudget}
            onChange={(event) => onAmount(event.target.value)}
            className="mt-1 rounded-lg"
          />
        </label>
      </div>
      <Button
        type="button"
        variant="outline"
        className="rounded-lg"
        disabled={pending || !hasCard || !canEditBudget}
        onClick={onSave}
      >
        Save amounts
      </Button>
    </div>
  );
}

function EmptyTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">{body}</p>
    </div>
  );
}

function SimpleDialog({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-kenoo-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-neutral-500">{body}</p>
        <Button
          type="button"
          className="mt-5 h-10 rounded-lg bg-neutral-950"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </div>
  );
}

function BuyCreditsDialog({
  pending,
  canManageBilling,
  onClose,
  onBuy,
}: {
  pending: boolean;
  canManageBilling: boolean;
  onClose: () => void;
  onBuy: (cents: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-kenoo-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Buy credits</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Prepaid credits are billed per API request.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {TOPUP_AMOUNTS.map((cents) => (
            <Button
              key={cents}
              type="button"
              variant="outline"
              disabled={pending || !canManageBilling}
              className="h-11 rounded-lg"
              onClick={() => onBuy(cents)}
            >
              {formatUsdFromCents(cents)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
