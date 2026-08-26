"use client";

import { Slider } from "@walls/ui/slider";
import { cn } from "@walls/utils";

import {
  SPEND_AGGRESSIVENESS_LEVELS,
  SPEND_AGGRESSIVENESS_MAX,
  SPEND_AGGRESSIVENESS_MIN,
  getAggressivenessHint,
  getAggressivenessLabel,
  normalizeAggressiveness,
  type SpendAggressivenessLevel,
} from "@/lib/spend-automation-settings";

type AggressivenessFieldProps = {
  value: number;
  onChange: (value: SpendAggressivenessLevel) => void;
};

export function AggressivenessField({
  value,
  onChange,
}: AggressivenessFieldProps) {
  const level = normalizeAggressiveness(value);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-1">
        <p className="text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500">
          Spend aggressiveness
        </p>
        <p className="text-xl font-light tracking-tight text-neutral-900 sm:text-2xl">
          {level} · {getAggressivenessLabel(level)}
        </p>
        <p className="text-xs font-light text-neutral-500">
          {getAggressivenessHint(level)}
        </p>
      </div>

      <div className="pt-1">
        <div className="relative h-4">
          <div
            className="pointer-events-none absolute inset-x-2 top-1/2 z-0 flex -translate-y-1/2 justify-between"
            aria-hidden
          >
            {SPEND_AGGRESSIVENESS_LEVELS.map((stop) => (
              <span
                key={stop}
                className={cn(
                  "size-2 rounded-full",
                  stop <= level ? "bg-[var(--kenoo-sky)]" : "bg-neutral-300",
                )}
              />
            ))}
          </div>
          <Slider
            className="relative z-10"
            value={[level]}
            min={SPEND_AGGRESSIVENESS_MIN}
            max={SPEND_AGGRESSIVENESS_MAX}
            step={1}
            onValueChange={(next) => onChange(normalizeAggressiveness(next[0]))}
            aria-valuemin={SPEND_AGGRESSIVENESS_MIN}
            aria-valuemax={SPEND_AGGRESSIVENESS_MAX}
            aria-valuenow={level}
            aria-label="Spend aggressiveness"
          />
        </div>

        <div className="mt-4 grid grid-cols-5">
          {SPEND_AGGRESSIVENESS_LEVELS.map((stop) => {
            const active = stop === level;
            return (
              <button
                key={stop}
                type="button"
                onClick={() => onChange(stop)}
                aria-label={`${stop}, ${getAggressivenessLabel(stop)}`}
                aria-pressed={active}
                className={cn(
                  "cursor-pointer border-none bg-transparent p-0 text-[11px] font-medium tabular-nums tracking-wide",
                  stop === 1 && "text-left",
                  stop === 5 && "text-right",
                  stop !== 1 && stop !== 5 && "text-center",
                  active
                    ? "text-[var(--kenoo-sky)]"
                    : "text-neutral-400 hover:text-neutral-600",
                )}
              >
                {stop}
              </button>
            );
          })}
        </div>
        <div className="relative mt-2 w-full text-[10px] font-normal uppercase tracking-[0.12em] text-neutral-500 sm:text-[11px]">
          <span>Protect</span>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center">
            Neutral
          </span>
          <span className="absolute right-0 text-right">Max growth</span>
        </div>
      </div>
    </div>
  );
}
