import { formatCurrencyFromMicros, formatRoas } from "@/lib/format-analytics";
import type {
  EntityDetailMetrics,
  ReachSaturation,
  RecentWindowMetrics,
} from "@/lib/entity-detail-server";
import { isGoogleAdsProvider, isMetaAdsProvider } from "@/lib/entity-labels";
import { calculateAdjustedProfitMicros } from "@/lib/spend-automation-settings";

export type BudgetChangeWarning = {
  tone: "ok" | "info" | "caution" | "danger";
  title: string;
  body: string;
};

const SATURATION_GUIDES = [
  {
    pct: 5,
    label: "~5%",
    title: "Low saturation",
    why: "First ROI dip often shows up here. The easiest converters are gone, so CPA can start to slip.",
  },
  {
    pct: 20,
    label: "~20%",
    title: "Rising costs",
    why: "Responsive pockets are thinning. Meta spends more on colder people, so costs usually climb.",
  },
  {
    pct: 50,
    label: "~50%",
    title: "Harder unique reach",
    why: "New people get scarce. Extra spend mostly buys frequency, and returns get stubborn.",
  },
] as const;

const META_LEARNING_RESET_PCT = 20;
const META_HEAVY_BOOST_PCT = 50;
const FORECAST_DAYS = 7;

function estimateSpendToSaturationMicros(
  spendMicros: number,
  currentRatio: number,
  targetRatio: number,
): number | null {
  if (spendMicros <= 0 || currentRatio <= 0 || targetRatio <= 0) return null;
  if (currentRatio >= targetRatio) return 0;
  const projectedAtTarget = spendMicros * (targetRatio / currentRatio);
  if (!Number.isFinite(projectedAtTarget)) return null;
  return Math.max(0, Math.round(projectedAtTarget - spendMicros));
}

function formatHorizon(spendMicros: number, dailyBudgetMicros: number): string | null {
  if (spendMicros <= 0 || dailyBudgetMicros <= 0) return null;
  const daysExact = spendMicros / dailyBudgetMicros;
  if (!Number.isFinite(daysExact) || daysExact < 0) return null;
  if (daysExact === 0) return "already there";
  if (daysExact < 1) {
    const hours = Math.max(1, Math.round(daysExact * 24));
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.max(1, Math.round(daysExact));
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  const weeks = Math.round(days / 7);
  if (days < 60) return `${weeks} week${weeks === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"}`;
}

function nextSaturationGuide(pct: number) {
  return SATURATION_GUIDES.find((guide) => pct < guide.pct) ?? null;
}

export function resolveRecentWindow(
  recent7d: RecentWindowMetrics | null | undefined,
  trailing: EntityDetailMetrics | null | undefined,
): {
  label: string;
  spendMicros: number;
  conversionValueMicros: number;
  roas: number | null;
} | null {
  if (recent7d && recent7d.spendMicros > 0) {
    return {
      label: "last 7 days",
      spendMicros: recent7d.spendMicros,
      conversionValueMicros: recent7d.conversionValueMicros,
      roas: recent7d.roas,
    };
  }
  if (trailing && trailing.spendMicros > 0) {
    return {
      label: "last 30 days",
      spendMicros: trailing.spendMicros,
      conversionValueMicros: trailing.conversionValueMicros,
      roas: trailing.roas,
    };
  }
  return null;
}

export function buildBudgetChangePreview(input: {
  previousMicros: number;
  proposedMicros: number | null;
  provider: string | null | undefined;
  learningStatus?: string | null;
  reachSaturation?: ReachSaturation | null;
  recent: ReturnType<typeof resolveRecentWindow>;
  breakEvenRoas?: number | null;
}) {
  const previous = input.previousMicros;
  const proposed = input.proposedMicros;
  if (proposed == null || previous <= 0) return null;

  const deltaMicros = proposed - previous;
  const changePct = (deltaMicros / previous) * 100;
  const direction: "increase" | "decrease" | "hold" =
    Math.abs(changePct) < 0.05 ? "hold" : deltaMicros > 0 ? "increase" : "decrease";

  const currentWeekSpend = previous * FORECAST_DAYS;
  const proposedWeekSpend = proposed * FORECAST_DAYS;
  const roas = input.recent?.roas ?? null;
  const hasRoas = roas != null && roas > 0;

  const currentWeekRevenue = hasRoas ? Math.round(currentWeekSpend * roas) : null;
  const proposedWeekRevenue = hasRoas ? Math.round(proposedWeekSpend * roas) : null;
  const currentWeekProfit =
    currentWeekRevenue != null
      ? calculateAdjustedProfitMicros({
          revenueMicros: currentWeekRevenue,
          spendMicros: currentWeekSpend,
          breakEvenRoas: input.breakEvenRoas,
        })
      : null;
  const proposedWeekProfit =
    proposedWeekRevenue != null
      ? calculateAdjustedProfitMicros({
          revenueMicros: proposedWeekRevenue,
          spendMicros: proposedWeekSpend,
          breakEvenRoas: input.breakEvenRoas,
        })
      : null;

  const lifetimeReach = input.reachSaturation?.lifetimeReach ?? null;
  const ceiling =
    input.reachSaturation?.estimatedAudienceUpper ??
    input.reachSaturation?.estimatedAudienceLower ??
    null;
  const lifetimeSpend = input.reachSaturation?.lifetimeSpendMicros ?? 0;
  const saturationPct =
    lifetimeReach != null && ceiling != null && ceiling > 0
      ? Math.min(100, (lifetimeReach / ceiling) * 100)
      : null;
  const nextGuide = saturationPct != null ? nextSaturationGuide(saturationPct) : null;
  const spendToNext =
    saturationPct != null && nextGuide != null
      ? estimateSpendToSaturationMicros(
          lifetimeSpend,
          saturationPct / 100,
          nextGuide.pct / 100,
        )
      : null;

  const warnings: BudgetChangeWarning[] = [];
  const isMeta = isMetaAdsProvider(input.provider);
  const isGoogle = isGoogleAdsProvider(input.provider);
  const learning =
    (input.learningStatus ?? "").toUpperCase() === "LEARNING" ||
    (input.learningStatus ?? "").toUpperCase() === "LEARNING_LIMITED";

  if (direction === "hold") {
    warnings.push({
      tone: "ok",
      title: "No change",
      body: "This is the same daily budget that’s already live.",
    });
  }

  if (isMeta && direction === "increase" && Math.abs(changePct) >= META_HEAVY_BOOST_PCT) {
    warnings.push({
      tone: "danger",
      title: "Heavy boost, learning reset is likely",
      body: `Jumping about ${Math.round(Math.abs(changePct))}% in one shot often knocks Meta back into learning. ROAS can look messy for several days while it re-explores who to show.`,
    });
  } else if (
    isMeta &&
    direction === "increase" &&
    Math.abs(changePct) >= META_LEARNING_RESET_PCT
  ) {
    warnings.push({
      tone: "caution",
      title: "This can restart Meta’s learning phase",
      body: "Budget moves of ~20% or more on an ad set are a common trigger. Delivery and ROAS may wobble until learning exits again.",
    });
  }

  if (isMeta && learning && direction !== "hold") {
    warnings.push({
      tone: "caution",
      title: "Already in learning",
      body: "Changing budget now can reset the learning clock and stretch the unstable period.",
    });
  }

  if (isMeta && direction === "decrease" && Math.abs(changePct) >= META_LEARNING_RESET_PCT) {
    warnings.push({
      tone: "caution",
      title: "A sharp cut can also reset learning",
      body: "Meta treats big downsides like big upsides. Delivery may get jumpy, and you might under-spend for a few days.",
    });
  }

  if (isGoogle && direction === "increase" && Math.abs(changePct) >= META_HEAVY_BOOST_PCT) {
    warnings.push({
      tone: "info",
      title: "Spend may lag the new cap",
      body: "Google often takes a day or two to actually spend up to a much higher daily budget, especially on Search.",
    });
  }

  if (direction === "decrease" && Math.abs(changePct) >= 60) {
    warnings.push({
      tone: "caution",
      title: "This will starve delivery",
      body: "Cutting more than half overnight usually collapses volume. Winners can lose momentum.",
    });
  }

  if (hasRoas && proposedWeekProfit != null && currentWeekProfit != null) {
    if (direction === "increase" && proposedWeekProfit < currentWeekProfit) {
      warnings.push({
        tone: "caution",
        title: "More spend, less projected profit",
        body: "At the recent ROAS, the extra budget does not pay for itself over the next week. Treat this as a scale test, not a lock.",
      });
    }
  }

  if (!hasRoas && direction === "increase") {
    warnings.push({
      tone: "info",
      title: "No recent ROAS to project from",
      body: "We’ll still show spend pace, but profit for the next 7 days needs conversion value in the recent window.",
    });
  }

  return {
    previousMicros: previous,
    proposedMicros: proposed,
    deltaMicros,
    changePct,
    direction,
    forecastDays: FORECAST_DAYS,
    recentLabel: input.recent?.label ?? null,
    recentRoas: roas,
    week: {
      currentSpendMicros: currentWeekSpend,
      proposedSpendMicros: proposedWeekSpend,
      extraSpendMicros: proposedWeekSpend - currentWeekSpend,
      currentRevenueMicros: currentWeekRevenue,
      proposedRevenueMicros: proposedWeekRevenue,
      currentProfitMicros: currentWeekProfit,
      proposedProfitMicros: proposedWeekProfit,
      extraProfitMicros:
        currentWeekProfit != null && proposedWeekProfit != null
          ? proposedWeekProfit - currentWeekProfit
          : null,
    },
    saturation:
      nextGuide != null && spendToNext != null
        ? {
            currentPct: saturationPct,
            nextPct: nextGuide.pct,
            nextLabel: nextGuide.label,
            nextTitle: nextGuide.title,
            nextWhy: nextGuide.why,
            daysAtCurrent: formatHorizon(spendToNext, previous),
            daysAtProposed: formatHorizon(spendToNext, proposed),
          }
        : null,
    warnings,
    changeLabel:
      direction === "hold"
        ? "No change"
        : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(0)}% ${
            direction === "increase" ? "increase" : "decrease"
          }`,
    deltaPerDayLabel: `${deltaMicros >= 0 ? "+" : "−"}${formatCurrencyFromMicros(
      Math.abs(deltaMicros),
    )} / day`,
    recentRoasLabel: hasRoas ? formatRoas(roas) : null,
  };
}

export type BudgetChangePreview = NonNullable<
  ReturnType<typeof buildBudgetChangePreview>
>;
