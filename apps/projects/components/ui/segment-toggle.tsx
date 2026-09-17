"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type SegmentToggleOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

type SegmentToggleProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentToggleOption<T>[];
  "aria-label": string;
  className?: string;
};

export function SegmentToggle<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  className,
}: SegmentToggleProps<T>) {
  const layoutId = React.useId();

  return (
    <div
      className={cn(
        "flex w-max shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border border-white/70 bg-white/55 p-1 backdrop-blur-xl",
        "shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className="group relative flex min-w-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-transparent"
          >
            {active ? (
              <motion.span
                layoutId={`segment-toggle-pill-${layoutId}`}
                className="absolute inset-0 rounded-full bg-white/90 shadow-[0_4px_14px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-black/[0.04]"
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium uppercase tracking-wider transition-colors duration-200",
                active ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-700",
              )}
            >
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
