"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { SegmentToggle } from "@/components/ui/segment-toggle";
import { Slider } from "@walls/ui/slider";
import { cn } from "@walls/utils";

import { formatRoas } from "@/lib/format-analytics";
import {
  CONTRIBUTION_MARGIN_PRESETS,
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
  { value: "direct", label: "Stop-loss" },
  { value: "margin", label: "Break-Even ROAS" },
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
  const mode = settings.roasFloorInputMode ?? "direct";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {mode === "margin" ? "True Break-Even ROAS" : "Stop loss"}
          </p>
          <p className="mt-0.5 text-xs font-light text-neutral-500">
            {mode === "margin"
              ? "How much you keep from each sale after expenses. We calculate the ROAS you need to actually be profitable."
              : "The ROAS floor where AdPilot should slow down, pause, or alert."}
          </p>
        </div>
        <SegmentToggle
          aria-label="Stop-loss input mode"
          value={mode}
          onChange={(nextMode) => applyPatch({ roasFloorInputMode: nextMode })}
          options={MODE_OPTIONS}
        />
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
            <FloatingLabelInput
              type="number"
              min={0}
              step={0.1}
              label="Stop-loss ROAS"
              value={settings.roasFloor ?? directStopLossValue ?? ""}
              onChange={(e) =>
                applyPatch({
                  roasFloor: e.target.value ? Number(e.target.value) : null,
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

            <div>
              <p className="mb-2 text-[11px] font-normal uppercase tracking-[0.14em] text-neutral-500">
                Common margins
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONTRIBUTION_MARGIN_PRESETS.map((preset) => {
                  const active = marginPct === preset.marginPct;
                  return (
                    <button
                      key={preset.marginPct}
                      type="button"
                      onClick={() =>
                        applyPatch({ contributionMarginPct: preset.marginPct })
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] tabular-nums transition-all duration-200",
                        active
                          ? "border-white/70 bg-white/55 font-medium text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl backdrop-saturate-150"
                          : "border-transparent bg-neutral-100/80 font-medium text-neutral-400",
                      )}
                    >
                      {preset.marginPct}%
                      <span className="ml-1 font-light opacity-75">
                        · {formatRoas(preset.roasFloor)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
