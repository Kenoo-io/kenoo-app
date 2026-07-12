"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Apple,
  Flame,
  Loader2,
  Plus,
  Scale,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@walls/ui/button";
import { cn } from "@walls/utils";

import type { DashboardAnalytics } from "@/lib/analytics-server";
import { ZERO_DASHBOARD_STATS } from "@/lib/dashboard-defaults";
import { formatCalories, mealTypeLabel } from "@/lib/format-health";
import type { TimeRangeValue } from "@/lib/time-range";
import { TIME_RANGE_OPTIONS } from "@/lib/time-range";

import { CalorieTrendChart } from "./calorie-trend-chart";
import { HeroStat, MetricBarItem, SectionLabel } from "./dashboard-metrics";

const HERO_ACCENTS = [
  "var(--walls-sky)",
  "var(--walls-blue)",
  "#10b981",
  "#7a04eb",
  "var(--walls-yellow)",
  "#f59e0b",
] as const;

const HERO_ICONS = [UtensilsCrossed, Scale, Flame, Apple, Apple, Apple] as const;

export function DashboardPage() {
  const [analytics, setAnalytics] = React.useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [timeRange, setTimeRange] = React.useState<TimeRangeValue>("7d");

  const loadDashboard = React.useCallback(async () => {
    const response = await fetch(`/api/analytics?range=${timeRange}`);
    if (response.ok) {
      const payload = (await response.json()) as DashboardAnalytics;
      setAnalytics(payload);
    }
  }, [timeRange]);

  React.useEffect(() => {
    void (async () => {
      try {
        await loadDashboard();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadDashboard]);

  const stats = analytics?.stats ?? [...ZERO_DASHBOARD_STATS];
  const caloriesByDay = analytics?.caloriesByDay ?? [];
  const todayMeals = analytics?.todayMeals ?? [];
  const macros = analytics?.macros ?? [];
  const periodLabel = analytics?.periodLabel ?? "Last 7 days";
  const hasProfile = analytics?.hasProfile ?? false;

  const maxMacro = Math.max(
    ...macros.map((macro) => Math.max(macro.current, macro.target ?? 0)),
    1,
  );

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-walls-white px-6 py-16">
        <div className="flex items-center gap-2 text-sm font-light text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-walls-white">
      <div className="space-y-16 px-6 pt-6 pb-12 md:px-10 md:pt-8 md:pb-10">
        {!hasProfile ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm font-light text-amber-900">
            Set your calorie target and body metrics in{" "}
            <Link href="/settings" className="underline underline-offset-2">
              Settings
            </Link>{" "}
            to unlock personalized tracking.
          </div>
        ) : null}

        <div className="flex flex-row flex-wrap items-stretch justify-center gap-6 pb-2 pt-2 md:gap-8">
          {stats.map((stat, index) => (
            <HeroStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={HERO_ICONS[index] ?? UtensilsCrossed}
              accentColor={HERO_ACCENTS[index] ?? HERO_ACCENTS[0]}
              loading={loading}
              delay={index * 0.06}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>Calories — {periodLabel}</SectionLabel>
            <div className="flex gap-1">
              {TIME_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeRange(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-light uppercase tracking-wider transition-colors",
                    timeRange === option.value
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-500 hover:text-neutral-800",
                  )}
                >
                  {option.label.replace("Last ", "")}
                </button>
              ))}
            </div>
          </div>
          <CalorieTrendChart days={caloriesByDay} />
        </motion.div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <SectionLabel>Today&apos;s Meals</SectionLabel>
            {todayMeals.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-light text-neutral-400">
                  No meals logged yet today.
                </p>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-0 font-light text-neutral-500 hover:bg-transparent hover:text-neutral-800"
                >
                  <Link href="/meals">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Log a meal
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {todayMeals.map((meal, index) => (
                  <div key={meal.id} className="flex items-center gap-3">
                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{
                        background:
                          HERO_ACCENTS[index % HERO_ACCENTS.length] ??
                          "var(--walls-sky)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-light text-neutral-700">
                        {meal.name ?? mealTypeLabel(meal.meal_type)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-light text-neutral-400">
                        {mealTypeLabel(meal.meal_type)} ·{" "}
                        {new Date(meal.logged_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-medium tabular-nums text-neutral-800">
                      {formatCalories(meal.calories)}
                    </span>
                  </div>
                ))}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-8 rounded-full px-0 font-light text-neutral-500 hover:bg-transparent hover:text-neutral-800"
                >
                  <Link href="/meals">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Log another meal
                  </Link>
                </Button>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
          >
            <SectionLabel>Macro Breakdown — Today</SectionLabel>
            {macros.length === 0 ? (
              <p className="text-sm font-light text-neutral-400">
                Log meals to see macro breakdown.
              </p>
            ) : (
              <div className="space-y-4">
                {macros.map((macro, index) => (
                  <MetricBarItem
                    key={macro.label}
                    label={macro.label}
                    sublabel={
                      macro.target != null
                        ? `Target ${macro.target}g`
                        : "No target set"
                    }
                    value={macro.value}
                    numericValue={macro.current}
                    max={maxMacro}
                    color={
                      macro.color ??
                      HERO_ACCENTS[index % HERO_ACCENTS.length] ??
                      "var(--walls-sky)"
                    }
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
