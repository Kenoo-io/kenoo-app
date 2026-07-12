"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo } from "react";

import { cn } from "@walls/utils";

type ParsedDisplayNumber = {
  prefix: string;
  num: number;
  suffix: string;
  decimals: number;
};

function parseDisplayNumber(
  value: string | number,
): ParsedDisplayNumber | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      prefix: "",
      num: value,
      suffix: "",
      decimals: Number.isInteger(value) ? 0 : 2,
    };
  }

  if (typeof value !== "string") return null;
  const raw = value.trim();
  const match = raw.match(/(-?[\d,.]+)(\.\d+)?/);
  if (!match) return null;

  const numericChunk = (match[0] || "").replace(/,/g, "");
  const num = Number(numericChunk);
  if (!Number.isFinite(num)) return null;

  const idx = match.index ?? 0;
  const prefix = raw.slice(0, idx);
  const suffix = raw.slice(idx + match[0].length);
  const decimals = match[0].includes(".")
    ? (match[0].split(".")[1]?.length ?? 0)
    : 0;

  return { prefix, num, suffix, decimals };
}

type AnimatedMetricValueProps = {
  value: string | number;
  className?: string;
};

export function AnimatedMetricValue({
  value,
  className,
}: AnimatedMetricValueProps) {
  const parsed = useMemo(() => parseDisplayNumber(value), [value]);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 120,
    damping: 18,
    mass: 0.6,
  });

  const formatted = useTransform(spring, (latest) => {
    if (!parsed) return String(value);
    const next =
      parsed.decimals === 0
        ? Math.round(latest)
        : Number(latest.toFixed(parsed.decimals));
    const formattedNumber = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals,
    }).format(next);
    return `${parsed.prefix}${formattedNumber}${parsed.suffix}`;
  });

  useEffect(() => {
    if (!parsed) return;
    motionValue.set(parsed.num);
  }, [motionValue, parsed]);

  if (!parsed) {
    return <span className={className}>{value}</span>;
  }

  return (
    <motion.span className={cn("tabular-nums", className)}>{formatted}</motion.span>
  );
}
