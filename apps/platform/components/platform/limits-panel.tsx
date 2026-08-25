"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Mail,
  Pencil,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { LabeledSwitch } from "@walls/ui/switch";

import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import type { SpendAlertRow } from "@/lib/limits";
import { formatUsdFromCents } from "@/lib/money";

export type LimitsProduct = {
  id: string;
  slug: string;
  name: string;
  is_live: boolean;
};

export type ProductLimitState = {
  product_id: string;
  blocked: boolean;
  monthly_request_limit: number | null;
};

export function LimitsPanel({
  workspaceName,
  canEdit,
  monthlySpendLimitCents,
  spentThisMonthCents,
  daysUntilReset,
  autoTopupEnabled,
  autoTopupThresholdCents,
  autoTopupAmountCents,
  hasCard,
  spendAlerts,
  products,
  productLimits,
  requestCounts,
}: {
  workspaceName: string;
  canEdit: boolean;
  monthlySpendLimitCents: number | null;
  spentThisMonthCents: number;
  daysUntilReset: number;
  autoTopupEnabled: boolean;
  autoTopupThresholdCents: number;
  autoTopupAmountCents: number;
  hasCard: boolean;
  spendAlerts: SpendAlertRow[];
  products: LimitsProduct[];
  productLimits: ProductLimitState[];
  requestCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spendOpen, setSpendOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState<null | { id?: string; percent: number }>(
    null,
  );

  const limitsById = useMemo(() => {
    return new Map(productLimits.map((row) => [row.product_id, row]));
  }, [productLimits]);

  const blockedCount = productLimits.filter((row) => row.blocked).length;
  const rateCount = productLimits.filter(
    (row) => row.monthly_request_limit != null,
  ).length;

  const hasLimit = monthlySpendLimitCents != null;
  const spendRatio =
    hasLimit && monthlySpendLimitCents > 0
      ? Math.min(100, (spentThisMonthCents / monthlySpendLimitCents) * 100)
      : 0;

  async function postLimits(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save limits");
      }
      router.refresh();
      setSpendOpen(false);
      setProductsOpen(false);
      setRatesOpen(false);
      setAlertOpen(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save limits");
    } finally {
      setPending(false);
    }
  }

  async function saveAutoTopup(input: {
    enabled: boolean;
    thresholdCents: number;
    amountCents: number;
  }) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/auto-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save auto-reload");
      }
      router.refresh();
      setAutoOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to save auto-reload",
      );
    } finally {
      setPending(false);
    }
  }

  const autoCopy = !hasCard
    ? "Add a payment method on Billing to reload credits when the balance runs low."
    : autoTopupEnabled
      ? `When balance is ${formatUsdFromCents(autoTopupThresholdCents)}, reload by ${formatUsdFromCents(autoTopupAmountCents)}.`
      : "Auto-reload is off. Turn it on to restore credits when the wallet runs low.";

  const resetLabel =
    daysUntilReset === 0
      ? "Resets today"
      : daysUntilReset === 1
        ? "Resets in 1 day"
        : `Resets in ${daysUntilReset} days`;

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[32px] font-semibold tracking-tight text-neutral-950">
          Limits
        </h1>
        <span className="rounded-md bg-kenoo-emerald/25 px-2 py-0.5 text-[12px] font-medium text-kenoo-forest">
          Usage tier 1
        </span>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-950">Spend</h2>
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-kenoo-white px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-950">
                Organization spend limit
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">
                {workspaceName} · {resetLabel}
              </p>
            </div>
            <button
              type="button"
              disabled={!canEdit || pending}
              onClick={() => setSpendOpen(true)}
              className={pillButtonClass}
            >
              {hasLimit ? "Edit spend limit" : "Set spend limit"}
            </button>
          </div>

          <p className="mt-5 text-[28px] font-semibold tracking-tight text-neutral-950">
            {formatUsdFromCents(spentThisMonthCents)}
            <span className="text-neutral-400">
              {" "}
              / {hasLimit ? formatUsdFromCents(monthlySpendLimitCents) : "No limit"}
            </span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-kenoo-emerald"
              style={{
                width: `${hasLimit ? spendRatio : spentThisMonthCents > 0 ? 8 : 0}%`,
              }}
            />
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-sm text-kenoo-orange">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Requests will start to fail when the limit is reached.{" "}
              <Link href="/docs" className="underline underline-offset-2">
                Learn more
              </Link>
            </span>
          </p>

          <div className="mt-5 flex items-start justify-between gap-3 border-t border-neutral-100 pt-5">
            <div>
              <p className="text-sm font-semibold text-neutral-950">Auto-reload</p>
              <p className="mt-1 text-sm text-neutral-500">{autoCopy}</p>
            </div>
            <button
              type="button"
              disabled={!canEdit || pending}
              onClick={() => setAutoOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Edit auto-reload"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-kenoo-white px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-950">Spend alerts</h2>
          <button
            type="button"
            disabled={!canEdit || pending || !hasLimit}
            onClick={() => setAlertOpen({ percent: 80 })}
            className={pillButtonClass}
          >
            Add alert
          </button>
        </div>
        {!hasLimit ? (
          <p className="mt-3 text-sm text-neutral-500">
            Set a spend limit first to alert when usage reaches a percentage of
            it.
          </p>
        ) : spendAlerts.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No spend alerts yet. Add one to get notified as this workspace
            approaches its monthly cap.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100">
            {spendAlerts.map((alert) => {
              const amount =
                monthlySpendLimitCents != null
                  ? Math.round((monthlySpendLimitCents * alert.threshold_percent) / 100)
                  : 0;
              return (
                <li
                  key={alert.id}
                  className="flex items-center gap-3 py-3.5 first:pt-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <p className="min-w-0 flex-1 text-sm text-neutral-800">
                    Alert when spend reaches {alert.threshold_percent}% (
                    {formatUsdFromCents(amount)})
                  </p>
                  <button
                    type="button"
                    disabled={!canEdit || pending}
                    onClick={() =>
                      setAlertOpen({
                        id: alert.id,
                        percent: alert.threshold_percent,
                      })
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    aria-label="Edit alert"
                  >
                    <SquarePen className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit || pending}
                    onClick={() =>
                      postLimits({ kind: "alert-delete", alertId: alert.id })
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-950">Product usage</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-kenoo-white">
          <div className="flex items-center justify-between gap-4 px-5 py-5">
            <div>
              <p className="text-sm font-medium text-neutral-950">
                Allow or block products
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {blockedCount > 0
                  ? `${blockedCount} product${blockedCount === 1 ? "" : "s"} blocked in this workspace.`
                  : "Choose which products keys on this workspace can call."}
              </p>
            </div>
            <button
              type="button"
              disabled={!canEdit || pending}
              className={pillButtonClass}
              onClick={() => setProductsOpen(true)}
            >
              Select products
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-neutral-100 px-5 py-5">
            <div>
              <p className="text-sm font-medium text-neutral-950">Rate limits</p>
              <p className="mt-1 max-w-xl text-sm text-neutral-500">
                {rateCount > 0
                  ? `${rateCount} product${rateCount === 1 ? " has" : "s have"} a monthly request cap.`
                  : "Optional monthly request caps per product. Unlimited unless you set one."}
              </p>
            </div>
            <button
              type="button"
              disabled={!canEdit || pending}
              className={pillButtonClass}
              onClick={() => setRatesOpen(true)}
            >
              Select products
            </button>
          </div>
        </div>
      </section>

      {!canEdit ? (
        <p className="mt-6 text-sm text-neutral-400">
          Owners, admins, and members can edit limits for this workspace.
        </p>
      ) : null}

      {spendOpen ? (
        <SpendDialog
          pending={pending}
          currentCents={monthlySpendLimitCents}
          onClose={() => setSpendOpen(false)}
          onSave={(cents) =>
            postLimits({ kind: "spend", monthlySpendLimitCents: cents })
          }
        />
      ) : null}

      {autoOpen ? (
        <AutoReloadDialog
          pending={pending}
          hasCard={hasCard}
          enabled={autoTopupEnabled}
          thresholdCents={autoTopupThresholdCents}
          amountCents={autoTopupAmountCents}
          onClose={() => setAutoOpen(false)}
          onSave={saveAutoTopup}
        />
      ) : null}

      {alertOpen ? (
        <AlertDialog
          pending={pending}
          percent={alertOpen.percent}
          limitCents={monthlySpendLimitCents}
          onClose={() => setAlertOpen(null)}
          onSave={(percent) =>
            postLimits(
              alertOpen.id
                ? {
                    kind: "alert-update",
                    alertId: alertOpen.id,
                    thresholdPercent: percent,
                  }
                : { kind: "alert-add", thresholdPercent: percent },
            )
          }
        />
      ) : null}

      {productsOpen ? (
        <ProductsDialog
          title="Allow or block products"
          pending={pending}
          products={products}
          limitsById={limitsById}
          onClose={() => setProductsOpen(false)}
          onSave={(blockedProductIds) =>
            postLimits({ kind: "products", blockedProductIds })
          }
        />
      ) : null}

      {ratesOpen ? (
        <RatesDialog
          pending={pending}
          products={products}
          limitsById={limitsById}
          requestCounts={requestCounts}
          onClose={() => setRatesOpen(false)}
          onSave={(rateLimits) => postLimits({ kind: "rates", rateLimits })}
        />
      ) : null}
    </div>
  );
}

function SpendDialog({
  pending,
  currentCents,
  onClose,
  onSave,
}: {
  pending: boolean;
  currentCents: number | null;
  onClose: () => void;
  onSave: (cents: number | null) => void;
}) {
  const [value, setValue] = useState(
    currentCents != null ? String(currentCents / 100) : "100",
  );

  return (
    <Modal title="Monthly spend limit" onClose={onClose}>
      <p className="text-sm leading-6 text-neutral-500">
        Usage billed this calendar month cannot exceed this amount, even if the
        wallet still has credits.
      </p>
      <FloatingLabelInput
        label="Limit (USD)"
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        containerClassName="mt-4"
      />
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={modalSecondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
        {currentCents != null ? (
          <button
            type="button"
            disabled={pending}
            className={modalSecondaryButtonClass}
            onClick={() => onSave(null)}
          >
            Remove
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          className={modalPrimaryButtonClass}
          onClick={() => onSave(Math.round(Number(value) * 100))}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function AutoReloadDialog({
  pending,
  hasCard,
  enabled,
  thresholdCents,
  amountCents,
  onClose,
  onSave,
}: {
  pending: boolean;
  hasCard: boolean;
  enabled: boolean;
  thresholdCents: number;
  amountCents: number;
  onClose: () => void;
  onSave: (input: {
    enabled: boolean;
    thresholdCents: number;
    amountCents: number;
  }) => void;
}) {
  const [on, setOn] = useState(enabled && hasCard);
  const [threshold, setThreshold] = useState(String(thresholdCents / 100));
  const [amount, setAmount] = useState(String(amountCents / 100));

  return (
    <Modal title="Auto-reload" onClose={onClose}>
      <p className="text-sm leading-6 text-neutral-500">
        Charge the card on file when the wallet balance reaches your threshold.
      </p>
      {!hasCard ? (
        <p className="mt-3 text-sm text-neutral-500">
          <Link href="/billing" className="underline underline-offset-2">
            Add a payment method
          </Link>{" "}
          on Billing before turning this on.
        </p>
      ) : null}
      <div className="mt-4">
        <LabeledSwitch
          label="Auto-reload credits"
          description="Restore credits automatically when the balance runs low."
          checked={on}
          disabled={pending || !hasCard}
          onCheckedChange={setOn}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <FloatingLabelInput
          label="When balance is"
          type="number"
          min="1"
          step="1"
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
        />
        <FloatingLabelInput
          label="Reload by"
          type="number"
          min="10"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={modalSecondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending || !hasCard}
          className={modalPrimaryButtonClass}
          onClick={() =>
            onSave({
              enabled: on,
              thresholdCents: Math.round(Number(threshold) * 100),
              amountCents: Math.round(Number(amount) * 100),
            })
          }
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function AlertDialog({
  pending,
  percent,
  limitCents,
  onClose,
  onSave,
}: {
  pending: boolean;
  percent: number;
  limitCents: number | null;
  onClose: () => void;
  onSave: (percent: number) => void;
}) {
  const [value, setValue] = useState(String(percent));
  const parsed = Math.round(Number(value));
  const amount =
    limitCents != null && Number.isFinite(parsed)
      ? Math.round((limitCents * parsed) / 100)
      : 0;

  return (
    <Modal title="Spend alert" onClose={onClose}>
      <p className="text-sm leading-6 text-neutral-500">
        We’ll flag this workspace when monthly spend reaches this percentage of
        the limit.
      </p>
      <FloatingLabelInput
        label="Percent of limit"
        type="number"
        min="1"
        max="100"
        step="1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        containerClassName="mt-4"
      />
      {limitCents != null && parsed >= 1 && parsed <= 100 ? (
        <p className="mt-2 text-sm text-neutral-500">
          Alert at {formatUsdFromCents(amount)}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={modalSecondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending || parsed < 1 || parsed > 100}
          className={modalPrimaryButtonClass}
          onClick={() => onSave(parsed)}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function ProductsDialog({
  title,
  pending,
  products,
  limitsById,
  onClose,
  onSave,
}: {
  title: string;
  pending: boolean;
  products: LimitsProduct[];
  limitsById: Map<string, ProductLimitState>;
  onClose: () => void;
  onSave: (blockedProductIds: string[]) => void;
}) {
  const [blocked, setBlocked] = useState<Set<string>>(
    () =>
      new Set(
        [...limitsById.values()]
          .filter((row) => row.blocked)
          .map((row) => row.product_id),
      ),
  );

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm leading-6 text-neutral-500">
        Blocked products reject API calls from keys on this workspace.
      </p>
      <ul className="mt-4 space-y-2">
        {products.map((product) => {
          const isBlocked = blocked.has(product.id);
          return (
            <li key={product.id}>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2.5">
                <span>
                  <span className="block text-sm font-medium text-neutral-950">
                    {product.name}
                  </span>
                  <span className="text-[12px] text-neutral-400">
                    {product.is_live ? "Live" : "Not live yet"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[12px] text-neutral-500">Allowed</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!isBlocked}
                    onChange={(event) => {
                      setBlocked((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.delete(product.id);
                        else next.add(product.id);
                        return next;
                      });
                    }}
                  />
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={modalSecondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          className={modalPrimaryButtonClass}
          onClick={() => onSave([...blocked])}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function RatesDialog({
  pending,
  products,
  limitsById,
  requestCounts,
  onClose,
  onSave,
}: {
  pending: boolean;
  products: LimitsProduct[];
  limitsById: Map<string, ProductLimitState>;
  requestCounts: Record<string, number>;
  onClose: () => void;
  onSave: (
    rateLimits: { productId: string; monthlyRequestLimit: number | null }[],
  ) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const product of products) {
      const limit = limitsById.get(product.id)?.monthly_request_limit;
      initial[product.id] = limit != null ? String(limit) : "";
    }
    return initial;
  });

  return (
    <Modal title="Rate limits" onClose={onClose}>
      <p className="text-sm leading-6 text-neutral-500">
        Optional monthly request caps per product. Leave blank for unlimited.
      </p>
      <ul className="mt-4 space-y-3">
        {products.map((product) => (
          <li key={product.id}>
            <p className="text-sm font-medium text-neutral-950">{product.name}</p>
            <p className="text-[12px] text-neutral-400">
              {requestCounts[product.id] ?? 0} requests this month
            </p>
            <FloatingLabelInput
              label="Monthly requests"
              type="number"
              min="1"
              value={values[product.id] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [product.id]: event.target.value,
                }))
              }
              containerClassName="mt-1"
            />
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={modalSecondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          className={modalPrimaryButtonClass}
          onClick={() =>
            onSave(
              products.map((product) => {
                const raw = values[product.id]?.trim();
                return {
                  productId: product.id,
                  monthlyRequestLimit: raw ? Math.round(Number(raw)) : null,
                };
              }),
            )
          }
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

const pillButtonClass =
  "inline-flex h-8 shrink-0 items-center rounded-full border border-neutral-200 bg-kenoo-white px-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50";

const modalSecondaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50";

const modalPrimaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";
