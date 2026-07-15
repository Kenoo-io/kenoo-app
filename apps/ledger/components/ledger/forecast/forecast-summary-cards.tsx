"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from '@walls/utils';
import type { MonthlySnapshot } from "./agents-ledger-forecast";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

interface ForecastSummaryCardsProps {
  historical: MonthlySnapshot[];
  avgIncome: number;
  avgExpenses: number;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ForecastSummaryCards({
  historical,
  avgIncome,
  avgExpenses,
}: ForecastSummaryCardsProps) {
  const now = new Date();

  // Build next 6 months of projected cards
  const projectedMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    return {
      month: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      projectedIncome: avgIncome,
      projectedExpenses: avgExpenses,
      projectedNet: avgIncome - avgExpenses,
      isProjected: true,
    };
  });

  // Last 3 historical months for comparison
  const recentHistorical = historical.slice(-3).map((h) => ({
    month: h.month,
    year: h.year,
    projectedIncome: avgIncome,
    projectedExpenses: avgExpenses,
    projectedNet: avgIncome - avgExpenses,
    actualIncome: h.income,
    actualExpenses: h.expenses,
    actualNet: h.net,
    isProjected: false,
  }));

  return (
    <div className="flex flex-col gap-3 mt-4 pb-8">
      {/* Historical comparison (last 3 months) */}
      {recentHistorical.map((item, index) => (
        <motion.div
          key={`hist-${item.month}-${item.year}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
          className="rounded-[4rem] border border-neutral-200/60 bg-neutral-100 shadow-inner px-12 py-6 min-h-[5rem] flex flex-row items-center justify-between gap-4"
        >
          {/* Left: month label */}
          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
            <p className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tight uppercase">
              {item.month} <span className="text-neutral-400 font-light text-2xl">{item.year}</span>
            </p>
            <p className="text-sm font-light text-neutral-500">Actual</p>
          </div>

          {/* Right: actuals */}
          <div className="flex flex-col items-end flex-shrink-0 gap-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-light text-neutral-400 uppercase tracking-wider">Income</span>
              <p className="text-2xl font-black tabular-nums tracking-tight text-lime-400">
                +{formatCurrency(item.actualIncome)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-light text-neutral-400 uppercase tracking-wider">Expenses</span>
              <p className="text-2xl font-black tabular-nums tracking-tight text-neutral-900">
                -{formatCurrency(item.actualExpenses)}
              </p>
            </div>
            <div className="h-px w-full bg-neutral-200 my-0.5" />
            <div className="flex items-center gap-3">
              <span className="text-xs font-light text-neutral-400 uppercase tracking-wider">Net</span>
              <p
                className={cn(
                  "text-2xl font-black tabular-nums tracking-tight",
                  item.actualNet >= 0 ? "text-lime-400" : "text-red-500"
                )}
              >
                {item.actualNet >= 0 ? "+" : ""}
                {formatCurrency(item.actualNet)}
              </p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Divider */}
      <div className="flex items-center gap-3 py-2 px-4">
        <div className="flex-1 border-t border-dashed border-neutral-300" />
        <span className="text-xs font-light text-neutral-400 uppercase tracking-widest flex-shrink-0">
          Projected
        </span>
        <div className="flex-1 border-t border-dashed border-neutral-300" />
      </div>

      {/* Projected months */}
      {projectedMonths.map((item, index) => (
        <motion.div
          key={`proj-${item.month}-${item.year}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            delay: (recentHistorical.length + index) * 0.04,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="rounded-[4rem] border border-dashed border-neutral-300 bg-neutral-50 shadow-inner px-12 py-6 min-h-[5rem] flex flex-row items-center justify-between gap-4"
        >
          {/* Left: month label */}
          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
            <p className="text-4xl md:text-5xl font-black text-neutral-500 tracking-tight uppercase">
              {item.month} <span className="text-neutral-300 font-light text-2xl">{item.year}</span>
            </p>
            <p className="text-sm font-light text-neutral-400">Projected</p>
          </div>

          {/* Right: projections */}
          <div className="flex flex-col items-end flex-shrink-0 gap-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-light text-neutral-400 uppercase tracking-wider">Income</span>
              <p className="text-2xl font-black tabular-nums tracking-tight text-lime-300">
                ~+{formatCurrency(item.projectedIncome)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-light text-neutral-400 uppercase tracking-wider">Expenses</span>
              <p className="text-2xl font-black tabular-nums tracking-tight text-neutral-400">
                ~-{formatCurrency(item.projectedExpenses)}
              </p>
            </div>
            <div className="h-px w-full bg-neutral-200 my-0.5" />
            <div className="flex items-center gap-3">
              <span className="text-xs font-light text-neutral-400 uppercase tracking-wider">Net</span>
              <p
                className={cn(
                  "text-2xl font-black tabular-nums tracking-tight",
                  item.projectedNet >= 0 ? "text-lime-300" : "text-red-400"
                )}
              >
                ~{item.projectedNet >= 0 ? "+" : ""}
                {formatCurrency(item.projectedNet)}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
