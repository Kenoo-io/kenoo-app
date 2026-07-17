"use client";

import type { CSSProperties } from "react";

import type { SuiteCapability } from "@/lib/suites";
import { cn } from "@/lib/utils";

type SuiteOrbProps = {
  capability: SuiteCapability;
  size: "xs" | "sm" | "md" | "lg";
  active?: boolean;
  dimmed?: boolean;
  blurred?: boolean;
  className?: string;
};

const SIZE_CLASS = {
  xs: "h-[3.25rem] w-[3.25rem] md:h-[3.75rem] md:w-[3.75rem]",
  sm: "h-[4.75rem] w-[4.75rem] md:h-[5.5rem] md:w-[5.5rem]",
  md: "h-[7rem] w-[7rem] md:h-[8.25rem] md:w-[8.25rem]",
  lg: "h-[11rem] w-[11rem] md:h-[13.5rem] md:w-[13.5rem]",
} as const;

/**
 * Metallic, grainy 3D orb — layered lighting, film grain, bloom, specular.
 */
export function SuiteOrb({
  capability,
  size,
  active,
  dimmed,
  blurred,
  className,
}: SuiteOrbProps) {
  const { from, mid, to, glow } = capability.orb;

  return (
    <div
      className={cn(
        "suite-orb relative shrink-0",
        SIZE_CLASS[size],
        active && "suite-orb--active",
        dimmed && "suite-orb--dimmed",
        blurred && "suite-orb--blurred",
        className,
      )}
      style={
        {
          "--orb-from": from,
          "--orb-mid": mid,
          "--orb-to": to,
          "--orb-glow": glow,
        } as CSSProperties
      }
    >
      <span aria-hidden className="suite-orb__bloom" />
      <span aria-hidden className="suite-orb__shadow" />

      <span className="suite-orb__body">
        <span aria-hidden className="suite-orb__base" />
        <span aria-hidden className="suite-orb__iridescence" />
        <span aria-hidden className="suite-orb__shade" />
        <span aria-hidden className="suite-orb__fill" />
        <span aria-hidden className="suite-orb__grain" />
        <span aria-hidden className="suite-orb__grain suite-orb__grain--fine" />
        <span aria-hidden className="suite-orb__specular" />
        <span aria-hidden className="suite-orb__highlight" />
        <span aria-hidden className="suite-orb__rim" />
        <span aria-hidden className="suite-orb__inset" />
      </span>
    </div>
  );
}
