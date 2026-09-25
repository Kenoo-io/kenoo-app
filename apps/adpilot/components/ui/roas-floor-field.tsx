"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scale, ShieldAlert, Target, TrendingUp } from "lucide-react";

import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { SegmentToggle } from "@/components/ui/segment-toggle";
import { Switch } from "@walls/ui/switch";
import { Slider } from "@walls/ui/slider";
import { cn } from "@walls/utils";

import { formatRoas } from "@/lib/format-analytics";
import {
  getBreakEvenRoas,
  getStopLossMetricDefinition,
  getStopLossValue,
  isSalesStopLossContext,
  patchStopLossValue,
  patchRoasFloorSettings,
  resolveStopLossMetric,
  type StopLossContext,
  type RoasFloorInputMode,
  type SpendAutomationSettings,
} from "@/lib/spend-automation-settings";

type RoasFloorSlice = Partial<SpendAutomationSettings>;

type RoasFloorFieldProps = {
  settings: RoasFloorSlice;
  onChange: (patch: RoasFloorSlice) => void;
  context: StopLossContext;
  variant?: "settings" | "detail";
  className?: string;
};

const MODE_OPTIONS: Array<{ value: RoasFloorInputMode; label: string }> = [
  { value: "target", label: "Target ROAS" },
  { value: "margin", label: "Break-Even ROAS" },
  { value: "direct", label: "Stop-loss" },
];

export function RoasFloorField({
  settings,
  onChange,
  context,
  className,
}: RoasFloorFieldProps) {
  const stopLossMetric = resolveStopLossMetric(context);
  const stopLossDefinition = getStopLossMetricDefinition(stopLossMetric);
  const supportsBreakEven =
    stopLossMetric === "roas" && isSalesStopLossContext(context);
  const supportsTargetRoas =
    stopLossMetric === "roas" && context.optimizationGoal === "roas";
  const configuredMode = settings.roasFloorInputMode ?? "direct";
  const mode =
    configuredMode === "target" && !supportsTargetRoas
      ? "direct"
      : configuredMode;
  const marginPct = settings.contributionMarginPct ?? 50;
  const directStopLossValue = getStopLossValue(
    settings as SpendAutomationSettings,
    context,
  );
  const breakEvenRoas = getBreakEvenRoas({
    ...settings,
    roasFloorInputMode: mode,
    contributionMarginPct: marginPct,
  } as SpendAutomationSettings);

  const applyPatch = (
    patch: Partial<RoasFloorSlice>,
  ) => {
    onChange(
      patchRoasFloorSettings(
        {
          ...settings,
          roasFloorInputMode: mode,
          contributionMarginPct: settings.contributionMarginPct,
        } as SpendAutomationSettings,
        patch,
      ),
    );
  };

  if (!supportsBreakEven) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Stop loss</p>
            <p className="mt-0.5 text-xs font-light text-neutral-500">
              {stopLossDefinition.thresholdHint}
            </p>
          </div>
          <div className="rounded-full border border-black/[0.06] bg-white/60 px-3 py-1 text-xs font-medium text-neutral-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
            {stopLossDefinition.label}
          </div>
        </div>

        <FloatingLabelInput
          type="number"
          min={0}
          step={0.1}
          label={stopLossDefinition.thresholdLabel}
          containerClassName="max-w-sm"
          value={directStopLossValue ?? ""}
          onChange={(e) =>
            onChange(
              patchStopLossValue(
                settings as SpendAutomationSettings,
                context,
                e.target.value ? Number(e.target.value) : null,
              ) as RoasFloorSlice,
            )
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="-mt-1 pb-2">
        <SegmentToggle
          aria-label="ROAS guardrail mode"
          value={mode}
          onChange={(nextMode) => applyPatch({ roasFloorInputMode: nextMode })}
          equalWidth
          equalWidthClassName="w-full grid-cols-3"
          className="w-full max-w-[42rem] border-0 bg-neutral-200/65 shadow-none"
          activeClassName="text-neutral-500"
          options={MODE_OPTIONS.filter(
            (option) => option.value !== "target" || supportsTargetRoas,
          ).map((option) => {
            const Icon =
              option.value === "direct"
                ? ShieldAlert
                : option.value === "margin"
                  ? Scale
                  : Target;
            const active = mode === option.value;
            const stopLossEnabled =
              option.value === "direct" && settings.stopLossEnabled !== false;
            return {
              ...option,
              icon: (
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    stopLossEnabled
                      ? "fill-emerald-100 text-emerald-600"
                      : active
                      ? "text-[var(--kenoo-sky)]/60"
                      : "text-neutral-400",
                  )}
                  strokeWidth={1.6}
                />
              ),
            };
          })}
        />
      </div>
      <div className="flex items-start gap-3">
        {mode === "direct" ? (
          <Switch
            checked={settings.stopLossEnabled !== false}
            onCheckedChange={(stopLossEnabled) => onChange({ stopLossEnabled })}
            aria-label="Stop-loss enabled"
            size="md"
            className="mt-0.5"
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {mode === "margin"
              ? "True Break-Even ROAS"
              : mode === "target"
                ? "Target ROAS"
                : "Stop loss"}
          </p>
          <p className="mt-0.5 text-xs font-light text-neutral-500">
            {mode === "margin"
              ? "How much you keep from each sale after expenses. We calculate the ROAS you need to actually be profitable."
              : mode === "target"
                ? "The ROAS AdPilot should work toward while it scales campaign budget."
              : "The ROAS floor where AdPilot should slow down, pause, or alert."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "direct" ? (
          <motion.div
            key="direct"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {settings.stopLossEnabled !== false ? (
              <FloatingLabelInput
                type="number"
                min={0}
                step={0.1}
                label="Stop-loss ROAS"
                containerClassName="max-w-sm"
                value={settings.roasFloor ?? directStopLossValue ?? ""}
                onChange={(e) =>
                  applyPatch({
                    roasFloor: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/40 px-4 py-3 text-xs font-light text-neutral-500">
                Stop-loss is off. AdPilot will not act on ROAS falling below this
                threshold.
              </div>
            )}
          </motion.div>
        ) : mode === "target" ? (
          <motion.div
            key="target"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <FloatingLabelInput
              type="number"
              min={0}
              step={0.1}
              label="Target ROAS"
              containerClassName="max-w-sm"
              value={settings.targetRoas ?? ""}
              onChange={(e) =>
                onChange({
                  targetRoas: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="margin"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-black/[0.08] bg-neutral-200/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-normal uppercase tracking-[0.14em] text-neutral-500">
                    You need at least
                  </p>
                  <p className="mt-1 text-3xl font-medium tracking-tight text-neutral-700">
                    {formatRoas(breakEvenRoas)}
                  </p>
                  <p className="mt-1 text-xs font-light leading-relaxed text-neutral-500">
                    ROAS to break even after all business costs, not just ad
                    spend. Based on keeping {marginPct}% of each sale.
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/55 text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl backdrop-saturate-150">
                  <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-light leading-relaxed text-neutral-500">
                Of every dollar you make on a sale, what percentage is left
                after product cost, fulfillment, fees, and overhead, before you
                pay for ads?
              </p>
              <FloatingLabelInput
                type="number"
                min={1}
                max={100}
                step={0.1}
                label="Profit kept per sale (%)"
                containerClassName="max-w-sm"
                value={settings.contributionMarginPct ?? ""}
                onChange={(e) =>
                  applyPatch({
                    contributionMarginPct: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              />
              <Slider
                value={[marginPct]}
                onValueChange={(next) =>
                  applyPatch({ contributionMarginPct: next[0] ?? marginPct })
                }
                min={1}
                max={100}
                step={1}
                aria-label="Profit kept per sale"
              />
              <div className="flex justify-between text-[10px] font-light uppercase tracking-wider text-neutral-400">
                <span>1% kept</span>
                <span>100% kept</span>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
