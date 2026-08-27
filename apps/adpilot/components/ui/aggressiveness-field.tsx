"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

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

const SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.75,
};

const FADE = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as const,
};

/**
 * Snap against the pill’s end-cap centers (not the raw outer edge),
 * so far-left / far-right clicks land on levels 1 and 5 cleanly.
 */
function levelFromClientX(
  clientX: number,
  track: HTMLElement,
): SpendAggressivenessLevel {
  const rect = track.getBoundingClientRect();
  const radius = rect.height / 2;
  const travel = Math.max(rect.width - radius * 2, 1);
  const ratio = Math.min(
    1,
    Math.max(0, (clientX - rect.left - radius) / travel),
  );
  const raw =
    SPEND_AGGRESSIVENESS_MIN +
    Math.round(ratio * (SPEND_AGGRESSIVENESS_MAX - SPEND_AGGRESSIVENESS_MIN));
  return normalizeAggressiveness(raw);
}

export function AggressivenessField({
  value,
  onChange,
}: AggressivenessFieldProps) {
  const level = normalizeAggressiveness(value);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  const thumbPct =
    ((level - SPEND_AGGRESSIVENESS_MIN) /
      (SPEND_AGGRESSIVENESS_MAX - SPEND_AGGRESSIVENESS_MIN)) *
    100;

  const setFromPointer = React.useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      onChange(levelFromClientX(clientX, track));
    },
    [onChange],
  );

  const moveBy = React.useCallback(
    (delta: number) => {
      const next = normalizeAggressiveness(level + delta);
      if (next !== level) onChange(next);
    },
    [level, onChange],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      moveBy(1);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      moveBy(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      onChange(SPEND_AGGRESSIVENESS_MIN);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      onChange(SPEND_AGGRESSIVENESS_MAX);
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setFromPointer(event.clientX);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setFromPointer(event.clientX);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500">
          Spend aggressiveness
        </p>
        <div className="relative mt-1 min-h-[2.75rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={FADE}
              className="absolute inset-x-0 top-0"
            >
              <p className="text-xl font-light tracking-tight text-neutral-900 sm:text-2xl">
                {getAggressivenessLabel(level)}
              </p>
              <p className="mt-0.5 text-xs font-light text-neutral-500">
                {getAggressivenessHint(level)}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div
        role="slider"
        aria-label="Spend aggressiveness"
        aria-valuemin={SPEND_AGGRESSIVENESS_MIN}
        aria-valuemax={SPEND_AGGRESSIVENESS_MAX}
        aria-valuenow={level}
        aria-valuetext={`${level}, ${getAggressivenessLabel(level)}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "touch-none select-none outline-none",
          "cursor-grab active:cursor-grabbing",
          "focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-[var(--kenoo-sky)]/25 focus-visible:ring-offset-2",
        )}
      >
        {/*
          Geometry: track h-6 (24px) → end-cap radius 12px.
          Thumb + stops share a center-rail inset by that radius so
          level 1 / 5 nest into the pill ends.
        */}
        <div
          ref={trackRef}
          className="relative mx-1.5 h-6 overflow-hidden rounded-full bg-neutral-200/80"
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #c5dde6 0%, #8ec0cf 45%, #6eadc0 100%)",
            }}
            initial={false}
            animate={{
              // Past the glass’s leading edge so the join stays fully covered
              width: `calc(1.5rem + (100% - 1.5rem) * ${thumbPct / 100})`,
            }}
            transition={SPRING}
          />

          {/* Center rail: 0% = left end-cap center, 100% = right */}
          <div className="pointer-events-none absolute inset-y-0 left-3 right-3">
            {SPEND_AGGRESSIVENESS_LEVELS.map((stop) => {
              const stopPct =
                ((stop - SPEND_AGGRESSIVENESS_MIN) /
                  (SPEND_AGGRESSIVENESS_MAX - SPEND_AGGRESSIVENESS_MIN)) *
                100;
              const filled = stop <= level;

              return (
                <span
                  key={stop}
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300",
                    filled ? "bg-white/75" : "bg-neutral-400/45",
                  )}
                  style={{ left: `${stopPct}%` }}
                />
              );
            })}

            {/* Solid color disc — full thumb footprint, no gray under glass */}
            <motion.div
              aria-hidden
              className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6eadc0]"
              initial={false}
              animate={{ left: `${thumbPct}%` }}
              transition={SPRING}
            />

            <motion.div
              className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2"
              initial={false}
              animate={{ left: `${thumbPct}%` }}
              transition={SPRING}
            >
              <div
                className={cn(
                  "size-full rounded-full bg-white/90",
                  "ring-1 ring-black/[0.04]",
                  "shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_rgba(110,173,192,0.18)]",
                )}
              />
            </motion.div>
          </div>
        </div>

        <div className="relative mx-1.5 mt-3 h-4 text-[10px] font-normal uppercase tracking-[0.14em] text-neutral-400">
          <span className="absolute left-3 -translate-x-1/2">Protect</span>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center">
            Neutral
          </span>
          <span className="absolute right-3 translate-x-1/2 text-right">
            Max growth
          </span>
        </div>
      </div>
    </div>
  );
}
