"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Loader2, Pencil } from "lucide-react";

import { cn } from "@walls/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { panelGlassClass } from "@/components/ui/button-styles";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { formatCurrencyFromMicros } from "@/lib/format-analytics";
import type {
  EntityDetailMetrics,
  ReachSaturation,
  RecentWindowMetrics,
} from "@/lib/entity-detail-server";
import {
  buildBudgetChangePreview,
  resolveRecentWindow,
  type BudgetChangePreview,
  type BudgetChangeWarning,
} from "@/lib/budget-change-preview";

function microsToDollars(micros: number | null): string {
  if (micros == null || micros <= 0) return "";
  return String(Math.round((micros / 1_000_000) * 100) / 100);
}

function dollarsToMicros(value: string): number | null {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 1_000_000);
}

const modalSecondaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50";

const modalPrimaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";

function warningIconClass(tone: BudgetChangeWarning["tone"]) {
  if (tone === "danger") return "text-rose-500";
  if (tone === "caution") return "text-amber-500";
  return "text-[var(--kenoo-sky)]";
}

function actionableWarnings(warnings: BudgetChangeWarning[]) {
  return warnings.filter((warning) => warning.tone !== "ok");
}

function worstWarningTone(warnings: BudgetChangeWarning[]): BudgetChangeWarning["tone"] {
  if (warnings.some((warning) => warning.tone === "danger")) return "danger";
  if (warnings.some((warning) => warning.tone === "caution")) return "caution";
  return "info";
}

function WarningsHover({ warnings }: { warnings: BudgetChangeWarning[] }) {
  const items = actionableWarnings(warnings);
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [side, setSide] = React.useState<"left" | "right">("right");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const hideTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setIndex(0);
  }, [items.map((item) => item.title).join("|")]);

  React.useEffect(() => {
    return () => {
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (items.length === 0) return null;

  const place = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) {
      setSide("right");
      return;
    }
    setSide(window.innerWidth - rect.right > 268 ? "right" : "left");
  };

  const show = () => {
    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    place();
    setOpen(true);
  };
  const hide = () => {
    hideTimerRef.current = window.setTimeout(() => setOpen(false), 160);
  };

  const currentIndex = Math.min(index, items.length - 1);
  const current = items[currentIndex]!;
  const fromRight = side === "right";

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) hide();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          items.length === 1
            ? current.title
            : `${items.length} budget warnings`
        }
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
          "hover:bg-black/[0.04]",
          "outline-none focus:outline-none focus-visible:bg-black/[0.04]",
        )}
      >
        <AlertTriangle
          className={cn("h-4 w-4", warningIconClass(worstWarningTone(items)))}
          strokeWidth={1.75}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, x: fromRight ? 8 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: fromRight ? 6 : -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute top-0 z-30",
              fromRight ? "left-full pl-2.5" : "right-full pr-2.5",
            )}
            role="tooltip"
          >
            <div
              className={cn(
                "w-60 rounded-xl border border-black/[0.06] bg-white/95 px-3 py-2.5",
                "shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl",
              )}
            >
              <p className="text-xs font-medium leading-snug text-neutral-800">
                {current.title}
              </p>
              <p className="mt-1 text-xs font-light leading-relaxed text-neutral-500">
                {current.body}
              </p>
              {items.length > 1 ? (
                <div className="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setIndex(
                        (currentIndex - 1 + items.length) % items.length,
                      )
                    }
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-800"
                    aria-label="Previous warning"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <div className="flex flex-1 items-center justify-center gap-1">
                    {items.map((item, itemIndex) => (
                      <button
                        key={item.title}
                        type="button"
                        aria-label={`Warning ${itemIndex + 1}`}
                        onClick={() => setIndex(itemIndex)}
                        className={cn(
                          "h-1 rounded-full transition-all",
                          itemIndex === currentIndex
                            ? "w-3 bg-neutral-700"
                            : "w-1 bg-neutral-300 hover:bg-neutral-400",
                        )}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setIndex((currentIndex + 1) % items.length)
                    }
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-800"
                    aria-label="Next warning"
                  >
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function InfoHint({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    fromRight: boolean;
  } | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const hideTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const place = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 240;
    const gap = 10;
    const fromRight = rect.left > width + gap + 16;
    setCoords({
      top: rect.top,
      left: fromRight ? rect.left - gap - width : rect.right + gap,
      fromRight,
    });
  };

  const show = () => {
    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    place();
    setOpen(true);
  };
  const hide = () => {
    hideTimerRef.current = window.setTimeout(() => setOpen(false), 160);
  };

  return (
    <div
      ref={rootRef}
      className="relative mt-px shrink-0"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) hide();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={title}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 transition",
          "hover:text-neutral-700",
          "outline-none focus:outline-none focus-visible:text-neutral-700",
        )}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open && coords ? (
                <motion.div
                  initial={{
                    opacity: 0,
                    x: coords.fromRight ? -8 : 8,
                  }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: coords.fromRight ? -6 : 6,
                  }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "pointer-events-auto w-60 rounded-xl border border-black/[0.06] bg-white/95 px-3 py-2.5",
                    "shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl",
                  )}
                  style={{
                    position: "fixed",
                    top: coords.top,
                    left: coords.left,
                    zIndex: 400,
                  }}
                  role="tooltip"
                  onMouseEnter={show}
                  onMouseLeave={hide}
                >
                  <p className="text-xs font-medium leading-snug text-neutral-800">
                    {title}
                  </p>
                  <p className="mt-1 text-xs font-light leading-relaxed text-neutral-500">
                    {body}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

function signedMoney(micros: number | null | undefined) {
  if (micros == null) return null;
  const abs = formatCurrencyFromMicros(Math.abs(micros));
  if (micros > 0) return `+${abs}`;
  if (micros < 0) return `−${abs}`;
  return abs;
}

function PreviewStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-light uppercase tracking-wider text-neutral-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-medium tabular-nums text-neutral-900",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function BudgetPreviewSummary({ preview }: { preview: BudgetChangePreview }) {
  const extraProfit = signedMoney(preview.week.extraProfitMicros);
  const extraSpend = signedMoney(preview.week.extraSpendMicros);
  const profitMicros = preview.week.extraProfitMicros;
  const { saturation } = preview;
  const stats = [
    extraSpend ? { label: "7-day spend", value: extraSpend } : null,
    extraProfit
      ? {
          label: "7-day profit",
          value: extraProfit,
          valueClassName:
            profitMicros != null && profitMicros > 0
              ? "text-emerald-600"
              : profitMicros != null && profitMicros < 0
                ? "text-rose-600"
                : undefined,
        }
      : null,
    preview.recentRoasLabel
      ? { label: "Recent ROAS", value: preview.recentRoasLabel }
      : null,
  ].filter((stat): stat is { label: string; value: string; valueClassName?: string } =>
    Boolean(stat),
  );
  const saturationLine = saturation?.daysAtProposed;

  if (stats.length === 0 && !saturationLine) return null;

  return (
    <div className="divide-y divide-black/[0.06]">
      {stats.length > 0 ? (
        <div
          className={cn(
            "grid gap-3",
            saturationLine && "pb-2.5",
            stats.length === 1 && "grid-cols-1",
            stats.length === 2 && "grid-cols-2",
            stats.length >= 3 && "grid-cols-3",
          )}
        >
          {stats.map((stat) => (
            <PreviewStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
              valueClassName={stat.valueClassName}
            />
          ))}
        </div>
      ) : null}

      {saturationLine ? (
        <div
          className={cn(
            "flex items-start gap-1.5",
            stats.length > 0 && "pt-2.5",
          )}
        >
          {saturation.nextWhy ? (
            <InfoHint title={saturation.nextTitle} body={saturation.nextWhy} />
          ) : null}
          <p className="min-w-0 flex-1 text-xs font-light leading-relaxed text-neutral-500">
            {saturation.daysAtProposed === "already there" ? (
              <>Already at {saturation.nextLabel} reach</>
            ) : (
              <>
                <span className="font-medium text-neutral-800">
                  {saturation.daysAtProposed}
                </span>{" "}
                to {saturation.nextLabel} reach
              </>
            )}
            {saturation.daysAtCurrent &&
            saturation.daysAtCurrent !== "already there" ? (
              <>
                <span className="mx-1.5 text-neutral-300">·</span>
                {saturation.daysAtCurrent} if unchanged
              </>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function DailyBudgetEditor({
  entityId,
  label = "Daily budget",
  dailyBudgetMicros,
  inherited = false,
  provider,
  reachSaturation,
  recent7d,
  trailingMetrics,
  learningStatus,
  breakEvenRoas,
  onBudgetChange,
}: {
  entityId: string;
  label?: string;
  dailyBudgetMicros: number;
  inherited?: boolean;
  provider?: string | null;
  reachSaturation?: ReachSaturation | null;
  recent7d?: RecentWindowMetrics | null;
  trailingMetrics?: EntityDetailMetrics | null;
  learningStatus?: string | null;
  breakEvenRoas?: number | null;
  onBudgetChange: (next: {
    dailyBudgetMicros: number;
    dailyBudgetInherited: boolean;
  }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState(() =>
    microsToDollars(dailyBudgetMicros),
  );

  React.useEffect(() => {
    if (!open) {
      setAmount(microsToDollars(dailyBudgetMicros));
      setError(null);
      setSaving(false);
    }
  }, [dailyBudgetMicros, open]);

  const proposedMicros = dollarsToMicros(amount);
  const recent = resolveRecentWindow(recent7d, trailingMetrics ?? null);
  const preview = buildBudgetChangePreview({
    previousMicros: dailyBudgetMicros,
    proposedMicros,
    provider,
    learningStatus,
    reachSaturation,
    recent,
    breakEvenRoas,
  });

  const save = async () => {
    const micros = dollarsToMicros(amount);
    if (micros == null) {
      setError("Enter a daily budget greater than zero.");
      return;
    }

    if (micros === dailyBudgetMicros) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${entityId}/budget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyBudgetMicros: micros }),
      });
      const payload = (await response.json()) as {
        dailyBudgetMicros?: number;
        dailyBudgetInherited?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to update daily budget.");
        return;
      }

      onBudgetChange({
        dailyBudgetMicros: payload.dailyBudgetMicros ?? micros,
        dailyBudgetInherited: payload.dailyBudgetInherited ?? inherited,
      });
      setOpen(false);
    } catch {
      setError("Failed to update daily budget.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -mx-1.5 text-sm font-light text-neutral-500 transition",
            "hover:bg-black/[0.04] hover:text-neutral-800",
            "outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
            open && "bg-black/[0.04] text-neutral-800",
          )}
          aria-label={`Edit ${label.toLowerCase()}`}
        >
          <span>
            {label}: {formatCurrencyFromMicros(dailyBudgetMicros)}
          </span>
          <Pencil
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-neutral-400 transition-opacity",
              open
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "w-[min(calc(100vw-2rem),20rem)] overflow-visible border-0 p-4",
          panelGlassClass,
          "rounded-[22px] bg-white/95 backdrop-blur-xl",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900">
              Change daily budget
            </p>
            {inherited ? (
              <p className="mt-1 text-xs font-light text-neutral-500">
                Updates the campaign daily budget.
              </p>
            ) : null}
          </div>
          <AnimatePresence initial={false}>
            {preview &&
            preview.direction !== "hold" &&
            actionableWarnings(preview.warnings).length > 0 ? (
              <motion.div
                key="warnings-icon"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <WarningsHover warnings={preview.warnings} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="mt-3">
          <FloatingLabelInput
            type="number"
            min={0.01}
            step={0.01}
            label="Daily budget (USD)"
            value={amount}
            disabled={saving}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              }
            }}
          />
        </div>

        <AnimatePresence initial={false}>
          {preview &&
          preview.direction !== "hold" &&
          (preview.week.extraSpendMicros !== 0 ||
            preview.week.extraProfitMicros != null ||
            preview.recentRoasLabel ||
            preview.saturation?.daysAtProposed) ? (
            <motion.div
              key="budget-preview"
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 8, height: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 border-t border-black/[0.05] pt-3">
                <BudgetPreviewSummary preview={preview} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error ? (
          <p className="mt-2 text-xs font-light text-rose-600">{error}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-black/[0.05] pt-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => setOpen(false)}
            className={modalSecondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || proposedMicros == null}
            onClick={() => void save()}
            className={cn(modalPrimaryButtonClass, "gap-2")}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
