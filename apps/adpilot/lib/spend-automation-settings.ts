export type OptimizationGoal = "roas" | "ctr" | "cpa" | "conversions";
export type AdPlatformProvider = "meta" | "google";

export type AutomationStatus =
  | "inactive"
  | "active"
  | "paused"
  | "cooldown"
  | "learning"
  | "error";

export type RoasFloorInputMode = "direct" | "margin";

export type RoasFloorAction = "stop_campaign" | "email_alert";

export type StopLossMetric =
  | "roas"
  | "cpl"
  | "cpe"
  | "cpc"
  | "cpi"
  | "cpm"
  | "cvr"
  | "interaction_rate"
  | "unique_reach"
  | "cost_per_in_app_action"
  | "cost_per_local_action";

export type SpendAutomationSettings = {
  aggressiveness: number;
  maxDailyIncreasePct: number;
  maxDailyDecreasePct: number;
  roasFloor: number | null;
  roasFloorInputMode: RoasFloorInputMode;
  contributionMarginPct: number | null;
  ctrFloorPct: number | null;
  cpaCeiling: number | null;
  /** Multi-select: stop, email alert, both, or neither when ROAS floor is breached. */
  roasFloorActions: RoasFloorAction[];
  cooldownHours: number;
  learningPhaseProtection: boolean;
  pauseOnFatigue: boolean;
};

export type StopLossContext = {
  provider?: string | null;
  objective?: string | null;
  optimizationGoal?: OptimizationGoal | null;
};

export type StopLossMetricDefinition = {
  label: string;
  thresholdLabel: string;
  thresholdHint: string;
};

export const CONTRIBUTION_MARGIN_PRESETS = [
  { marginPct: 100, roasFloor: 1.0 },
  { marginPct: 90, roasFloor: 1.11 },
  { marginPct: 80, roasFloor: 1.25 },
  { marginPct: 70, roasFloor: 1.43 },
  { marginPct: 60, roasFloor: 1.67 },
  { marginPct: 50, roasFloor: 2.0 },
  { marginPct: 40, roasFloor: 2.5 },
  { marginPct: 30, roasFloor: 3.33 },
  { marginPct: 20, roasFloor: 5.0 },
] as const;

export const DEFAULT_SPEND_AUTOMATION_SETTINGS: SpendAutomationSettings = {
  aggressiveness: 62,
  maxDailyIncreasePct: 18,
  maxDailyDecreasePct: 12,
  roasFloor: 2.4,
  roasFloorInputMode: "direct",
  contributionMarginPct: 41.67,
  ctrFloorPct: 1.2,
  cpaCeiling: 42,
  roasFloorActions: ["stop_campaign"],
  cooldownHours: 24,
  learningPhaseProtection: true,
  pauseOnFatigue: true,
};

/** Namespaced alert key for shared `alert_subscriptions` / `alert_events`. */
export const ADPILOT_ROAS_FLOOR_ALERT_KEY = "adpilot.roas_floor_breach";

export const ROAS_FLOOR_ACTION_OPTIONS: Array<{
  value: RoasFloorAction;
  label: string;
  hint: string;
}> = [
  {
    value: "stop_campaign",
    label: "Stop campaign",
    hint: "Pause the campaign when ROAS drops below the floor",
  },
  {
    value: "email_alert",
    label: "Email alert",
    hint: "Email subscribed workspace members",
  },
];

export const STOP_LOSS_METRIC_DEFINITIONS: Record<
  StopLossMetric,
  StopLossMetricDefinition
> = {
  roas: {
    label: "ROAS",
    thresholdLabel: "Stop-loss ROAS",
    thresholdHint: "Minimum return before AdPilot keeps scaling.",
  },
  cpl: {
    label: "CPL",
    thresholdLabel: "Stop-loss CPL",
    thresholdHint: "Maximum cost per lead before AdPilot slows or stops.",
  },
  cpe: {
    label: "CPE",
    thresholdLabel: "Stop-loss CPE",
    thresholdHint: "Maximum cost per engagement before AdPilot slows or stops.",
  },
  cpc: {
    label: "CPC",
    thresholdLabel: "Stop-loss CPC",
    thresholdHint: "Maximum cost per click before AdPilot slows or stops.",
  },
  cpi: {
    label: "CPI",
    thresholdLabel: "Stop-loss CPI",
    thresholdHint: "Maximum cost per install before AdPilot slows or stops.",
  },
  cpm: {
    label: "CPM",
    thresholdLabel: "Stop-loss CPM",
    thresholdHint: "Maximum cost per 1,000 impressions before AdPilot slows or stops.",
  },
  cvr: {
    label: "CVR",
    thresholdLabel: "Stop-loss CVR",
    thresholdHint: "Minimum conversion rate before AdPilot slows or stops.",
  },
  interaction_rate: {
    label: "Interaction rate",
    thresholdLabel: "Stop-loss interaction rate",
    thresholdHint: "Minimum interaction rate before AdPilot slows or stops.",
  },
  unique_reach: {
    label: "Unique reach",
    thresholdLabel: "Stop-loss unique reach",
    thresholdHint: "Minimum unique reach before AdPilot slows or stops.",
  },
  cost_per_in_app_action: {
    label: "Cost per in-app action",
    thresholdLabel: "Stop-loss cost per in-app action",
    thresholdHint:
      "Maximum cost per in-app action before AdPilot slows or stops.",
  },
  cost_per_local_action: {
    label: "Cost per local action",
    thresholdLabel: "Stop-loss cost per local action",
    thresholdHint:
      "Maximum cost per local action before AdPilot slows or stops.",
  },
};

const ROAS_FLOOR_ACTION_VALUES = new Set<RoasFloorAction>(
  ROAS_FLOOR_ACTION_OPTIONS.map((option) => option.value),
);

export function normalizeRoasFloorActions(
  raw: unknown,
): RoasFloorAction[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_SPEND_AUTOMATION_SETTINGS.roasFloorActions];
  }

  const next: RoasFloorAction[] = [];
  for (const value of raw) {
    if (
      typeof value === "string" &&
      ROAS_FLOOR_ACTION_VALUES.has(value as RoasFloorAction) &&
      !next.includes(value as RoasFloorAction)
    ) {
      next.push(value as RoasFloorAction);
    }
  }

  // Empty is allowed — monitor the floor with no stop/alert side effects.
  return next;
}

function normalizeProvider(provider: string | null | undefined): AdPlatformProvider | null {
  if (!provider) return null;
  const normalized = provider.trim().toLowerCase();
  if (normalized === "meta" || normalized === "facebook") return "meta";
  if (normalized === "google" || normalized === "google_ads") return "google";
  return null;
}

function normalizeObjective(objective: string | null | undefined): string {
  return objective?.trim().toUpperCase() ?? "";
}

function isMetaSalesObjective(objective: string): boolean {
  return (
    objective === "OUTCOME_SALES" ||
    objective === "CONVERSIONS" ||
    objective === "PRODUCT_CATALOG_SALES" ||
    objective.includes("SALES")
  );
}

function resolveMetaStopLossMetric(objective: string): StopLossMetric | null {
  if (!objective) return null;
  if (isMetaSalesObjective(objective)) return "roas";
  if (
    objective === "OUTCOME_LEADS" ||
    objective === "LEAD_GENERATION" ||
    objective === "MESSAGES"
  ) {
    return "cpl";
  }
  if (
    objective === "OUTCOME_ENGAGEMENT" ||
    objective === "POST_ENGAGEMENT" ||
    objective === "VIDEO_VIEWS"
  ) {
    return "cpe";
  }
  if (objective === "OUTCOME_TRAFFIC" || objective === "LINK_CLICKS") {
    return "cpc";
  }
  if (objective === "OUTCOME_APP_PROMOTION" || objective === "APP_INSTALLS") {
    return "cpi";
  }
  if (
    objective === "OUTCOME_AWARENESS" ||
    objective === "BRAND_AWARENESS" ||
    objective === "REACH"
  ) {
    return "cpm";
  }
  return null;
}

function resolveGoogleStopLossMetric(objective: string): StopLossMetric | null {
  if (!objective) return null;
  if (
    objective.includes("SALES") ||
    objective.includes("SHOPPING") ||
    objective.includes("REVENUE")
  ) {
    return "roas";
  }
  if (
    objective.includes("LEAD") ||
    objective.includes("SIGN_UP") ||
    objective.includes("CONTACT")
  ) {
    return "cvr";
  }
  if (objective.includes("TRAFFIC") || objective.includes("CLICK")) {
    return "cpc";
  }
  if (
    objective.includes("CONSIDERATION") ||
    objective.includes("INTERACTION") ||
    objective.includes("ENGAGEMENT") ||
    objective.includes("VIDEO")
  ) {
    return "interaction_rate";
  }
  if (
    objective.includes("AWARENESS") ||
    objective.includes("REACH") ||
    objective.includes("IMPRESSION")
  ) {
    return "unique_reach";
  }
  if (objective.includes("APP")) {
    return "cost_per_in_app_action";
  }
  if (objective.includes("LOCAL") || objective.includes("STORE_VISIT")) {
    return "cost_per_local_action";
  }
  return null;
}

export function isSalesStopLossContext(context: StopLossContext): boolean {
  const provider = normalizeProvider(context.provider);
  const objective = normalizeObjective(context.objective);
  const metric = resolveStopLossMetric(context);

  if (metric === "roas") return true;
  if (provider === "meta" && isMetaSalesObjective(objective)) return true;
  return context.optimizationGoal === "roas";
}

export function resolveStopLossMetric(
  context: StopLossContext,
): StopLossMetric {
  const provider = normalizeProvider(context.provider);
  const objective = normalizeObjective(context.objective);

  if (provider === "meta") {
    return resolveMetaStopLossMetric(objective) ?? fallbackStopLossMetric(context);
  }

  if (provider === "google") {
    return resolveGoogleStopLossMetric(objective) ?? fallbackStopLossMetric(context);
  }

  return fallbackStopLossMetric(context);
}

function fallbackStopLossMetric(context: StopLossContext): StopLossMetric {
  switch (context.optimizationGoal) {
    case "ctr":
      return "cpc";
    case "cpa":
    case "conversions":
      return "cpl";
    case "roas":
    default:
      return "roas";
  }
}

export function getStopLossMetricDefinition(
  metric: StopLossMetric,
): StopLossMetricDefinition {
  return STOP_LOSS_METRIC_DEFINITIONS[metric];
}

export function getStopLossMetricLabel(metric: StopLossMetric): string {
  return getStopLossMetricDefinition(metric).label;
}

export function isStopLossCostMetric(metric: StopLossMetric): boolean {
  return (
    metric === "cpl" ||
    metric === "cpe" ||
    metric === "cpc" ||
    metric === "cpi" ||
    metric === "cpm" ||
    metric === "cost_per_in_app_action" ||
    metric === "cost_per_local_action"
  );
}

export function isStopLossRateMetric(metric: StopLossMetric): boolean {
  return (
    metric === "cvr" ||
    metric === "interaction_rate" ||
    metric === "unique_reach"
  );
}

export function toggleRoasFloorAction(
  current: RoasFloorAction[],
  action: RoasFloorAction,
): RoasFloorAction[] {
  if (current.includes(action)) {
    return current.filter((value) => value !== action);
  }
  return [...current, action];
}

/** Break-even ROAS from contribution margin % (revenue after variable costs, before ad spend). */
export function roasFloorFromContributionMargin(marginPct: number): number | null {
  if (!Number.isFinite(marginPct) || marginPct <= 0 || marginPct > 100) {
    return null;
  }
  return Math.round((100 / marginPct) * 100) / 100;
}

export function contributionMarginFromRoasFloor(roasFloor: number): number | null {
  if (!Number.isFinite(roasFloor) || roasFloor <= 0) {
    return null;
  }
  return Math.round((100 / roasFloor) * 100) / 100;
}

export function getBreakEvenRoas(
  settings: Pick<
    SpendAutomationSettings,
    "roasFloor" | "roasFloorInputMode" | "contributionMarginPct"
  >,
): number | null {
  const fromMargin =
    settings.contributionMarginPct != null
      ? roasFloorFromContributionMargin(settings.contributionMarginPct)
      : null;
  if (fromMargin != null) return fromMargin;
  return settings.roasFloor;
}

/**
 * Adjust profit by the margin implied by break-even ROAS:
 * profit = (revenue / BE ROAS) - ad spend.
 */
export function calculateAdjustedProfitMicros(input: {
  revenueMicros: number;
  spendMicros: number;
  breakEvenRoas: number | null | undefined;
}): number {
  const revenueMicros = Number.isFinite(input.revenueMicros) ? input.revenueMicros : 0;
  const spendMicros = Number.isFinite(input.spendMicros) ? input.spendMicros : 0;
  const breakEvenRoas = input.breakEvenRoas;

  if (
    breakEvenRoas == null ||
    !Number.isFinite(breakEvenRoas) ||
    breakEvenRoas <= 0
  ) {
    return revenueMicros - spendMicros;
  }

  return Math.round(revenueMicros / breakEvenRoas) - spendMicros;
}

export function getStopLossValue(
  settings: SpendAutomationSettings,
  context: StopLossContext,
): number | null {
  const metric = resolveStopLossMetric(context);

  if (metric === "roas") {
    return settings.roasFloor;
  }

  if (isStopLossCostMetric(metric)) {
    return settings.cpaCeiling;
  }

  if (isStopLossRateMetric(metric)) {
    return settings.ctrFloorPct;
  }

  return null;
}

export function patchStopLossValue(
  settings: SpendAutomationSettings,
  context: StopLossContext,
  value: number | null,
): Partial<SpendAutomationSettings> {
  const metric = resolveStopLossMetric(context);

  if (metric === "roas") {
    return patchRoasFloorSettings(settings, { roasFloor: value });
  }

  if (isStopLossCostMetric(metric)) {
    return { cpaCeiling: value };
  }

  if (isStopLossRateMetric(metric)) {
    return { ctrFloorPct: value };
  }

  return {};
}

export function sanitizeBreakEvenRoasSettings(
  settings: SpendAutomationSettings,
  context: StopLossContext,
): SpendAutomationSettings {
  if (isSalesStopLossContext(context)) {
    return settings;
  }

  return {
    ...settings,
    roasFloorInputMode: "direct",
    contributionMarginPct: null,
  };
}

export function validateAutomationSettings(
  settings: SpendAutomationSettings,
  context: StopLossContext,
): string | null {
  const stopLossValue = getStopLossValue(settings, context);
  if (
    stopLossValue != null &&
    (!Number.isFinite(stopLossValue) || stopLossValue < 0)
  ) {
    return "Stop-loss value must be zero or greater.";
  }

  if (isSalesStopLossContext(context) && settings.roasFloorInputMode === "margin") {
    const margin = settings.contributionMarginPct;
    if (
      margin == null ||
      !Number.isFinite(margin) ||
      margin < 1 ||
      margin > 100
    ) {
      return "Profit kept per sale must be between 1% and 100%.";
    }
  }

  return null;
}

export function syncRoasFloorSettings(
  settings: SpendAutomationSettings,
): SpendAutomationSettings {
  const next = { ...settings };

  // Backward compatibility: older saved presets used margin mode while storing
  // the derived ROAS in `roasFloor`. If margin exists, keep it as the source of
  // truth. If margin is missing but margin mode is enabled, derive the margin
  // once from the stored legacy ROAS so BE ROAS and stop-loss can diverge.
  if (
    next.roasFloorInputMode === "margin" &&
    next.contributionMarginPct == null &&
    next.roasFloor != null
  ) {
    next.contributionMarginPct = contributionMarginFromRoasFloor(next.roasFloor);
  }

  return next;
}

export function patchRoasFloorSettings(
  settings: SpendAutomationSettings,
  patch: Partial<
    Pick<
      SpendAutomationSettings,
      "roasFloor" | "roasFloorInputMode" | "contributionMarginPct"
    >
  >,
): Pick<
  SpendAutomationSettings,
  "roasFloor" | "roasFloorInputMode" | "contributionMarginPct"
> {
  const merged = syncRoasFloorSettings({ ...settings, ...patch });
  return {
    roasFloor: merged.roasFloor,
    roasFloorInputMode: merged.roasFloorInputMode,
    contributionMarginPct: merged.contributionMarginPct,
  };
}

export const OPTIMIZATION_GOAL_OPTIONS: Array<{
  value: OptimizationGoal;
  label: string;
  hint: string;
}> = [
  {
    value: "roas",
    label: "ROAS",
    hint: "Maximize return on ad spend",
  },
  {
    value: "ctr",
    label: "CTR",
    hint: "Improve click-through rate",
  },
  {
    value: "cpa",
    label: "CPA",
    hint: "Keep cost per acquisition under ceiling",
  },
  {
    value: "conversions",
    label: "Conversions",
    hint: "Drive more conversion volume",
  },
];

export function mergeAutomationSettings(
  base: SpendAutomationSettings,
  override: Partial<SpendAutomationSettings>,
): SpendAutomationSettings {
  return { ...base, ...override };
}

/** True when every spend-automation field matches (used for preset vs custom UI). */
export function spendSettingsEqual(
  a: SpendAutomationSettings,
  b: SpendAutomationSettings,
): boolean {
  const keys = Object.keys(
    DEFAULT_SPEND_AUTOMATION_SETTINGS,
  ) as Array<keyof SpendAutomationSettings>;
  return keys.every((key) => {
    const left = a[key];
    const right = b[key];
    if (Array.isArray(left) || Array.isArray(right)) {
      return JSON.stringify(left) === JSON.stringify(right);
    }
    return left === right;
  });
}

export function parseAutomationSettings(
  raw: unknown,
): SpendAutomationSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SPEND_AUTOMATION_SETTINGS };
  }

  const input = raw as Record<string, unknown>;
  const knownKeys = Object.keys(
    DEFAULT_SPEND_AUTOMATION_SETTINGS,
  ) as Array<keyof SpendAutomationSettings>;
  const filtered = Object.fromEntries(
    knownKeys
      .filter((key) => key in input)
      .map((key) => [key, input[key as string]]),
  ) as Partial<SpendAutomationSettings>;

  const parsed = mergeAutomationSettings(
    DEFAULT_SPEND_AUTOMATION_SETTINGS,
    filtered,
  );
  return syncRoasFloorSettings({
    ...parsed,
    roasFloorActions: normalizeRoasFloorActions(parsed.roasFloorActions),
    cooldownHours: normalizeCooldownHours(parsed.cooldownHours),
    roasFloorInputMode: parsed.roasFloorInputMode ?? "direct",
  });
}

export function optimizationGoalLabel(goal: OptimizationGoal): string {
  return OPTIMIZATION_GOAL_OPTIONS.find((option) => option.value === goal)?.label ?? goal;
}

export const MIN_COOLDOWN_HOURS = 24;

export const COOLDOWN_OPTIONS = [
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "72 hours" },
] as const;

export function normalizeCooldownHours(hours: number | null | undefined): number {
  const allowed = COOLDOWN_OPTIONS.map((option) => option.value);
  const fallback = DEFAULT_SPEND_AUTOMATION_SETTINGS.cooldownHours;

  if (hours == null || !Number.isFinite(hours)) {
    return fallback;
  }

  const clamped = Math.max(MIN_COOLDOWN_HOURS, hours);
  if ((allowed as readonly number[]).includes(clamped)) {
    return clamped;
  }

  return allowed.reduce((best, option) =>
    Math.abs(option - clamped) < Math.abs(best - clamped) ? option : best,
  );
}

export function getAggressivenessLabel(value: number) {
  if (value < 34) return "Conservative";
  if (value < 67) return "Balanced";
  return "Aggressive";
}

/** Composite 0–100 risk from aggressiveness, max daily growth, ROAS floor, and floor actions. */
export function getRiskScore(
  settings: Pick<
    SpendAutomationSettings,
    | "aggressiveness"
    | "maxDailyIncreasePct"
    | "roasFloor"
    | "roasFloorInputMode"
    | "contributionMarginPct"
    | "roasFloorActions"
  >,
): number {
  const aggressiveness = Math.min(100, Math.max(0, settings.aggressiveness));
  const maxDailyIncreasePct = Math.min(
    50,
    Math.max(5, settings.maxDailyIncreasePct),
  );
  const effectiveFloor = settings.roasFloor;
  const floorValue =
    effectiveFloor == null || !Number.isFinite(effectiveFloor) || effectiveFloor <= 0
      ? 0
      : effectiveFloor;

  // Caps: aggressiveness ~42, growth ~24, weak/missing floor ~22, soft actions ~12.
  const aggressivenessRisk = (aggressiveness / 100) * 42;
  const growthRisk = ((maxDailyIncreasePct - 5) / 45) * 24;
  // 0/null floor stays fully risky; stronger floors decay quickly.
  const floorRisk = 22 * Math.exp(-floorValue / 1.6);

  const actions = settings.roasFloorActions ?? [];
  const hasStop = actions.includes("stop_campaign");
  const hasAlert = actions.includes("email_alert");
  // Stop only reduces risk when the floor can actually fire (> 0).
  let actionRisk = 0;
  if (floorValue > 0) {
    if (!hasStop) {
      actionRisk = hasAlert ? 10 : 12;
    }
  } else if (!hasStop && hasAlert) {
    actionRisk = 6;
  } else if (!hasStop && !hasAlert) {
    actionRisk = 10;
  }

  const raw = aggressivenessRisk + growthRisk + floorRisk + actionRisk;
  return Math.min(99, Math.max(5, Math.round(raw)));
}

export function getProjectedWeeklyUplift(
  aggressiveness: number,
  maxDailyIncreasePct: number,
) {
  const pct = Math.round(aggressiveness * 0.12 + maxDailyIncreasePct * 0.85);
  return `+${Math.min(48, pct)}%`;
}
