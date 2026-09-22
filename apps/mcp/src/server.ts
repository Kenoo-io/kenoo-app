import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema, type ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { KenooIdentity } from "./auth.js";

function text(value: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

// Keep the structured result shapes explicit so MCP clients can validate tool
// responses and models can reliably use one tool's result in a later call.
const CURRENT_USER_OUTPUT_SCHEMA = {
  id: z.string(),
  email: z.string().nullable(),
  createdAt: z.string().nullable(),
};
const CONNECTED_ACCOUNT_OUTPUT_SCHEMA = {
  accountId: z.string().uuid().nullable(),
  connected: z.boolean(),
};
const PROJECTS_OUTPUT_SCHEMA = {
  accountId: z.string().uuid().nullable(),
  projects: z.array(z.record(z.unknown())),
  message: z.string().optional(),
};
const AD_PERFORMANCE_OUTPUT_SCHEMA = {
  accountId: z.string().uuid(),
  rangeDays: z.number().int(),
  entities: z.array(z.record(z.unknown())),
};
const AUDIENCE_BREAKDOWN_OUTPUT_SCHEMA = {
  accountId: z.string().uuid(),
  breakdownType: z.enum(["gender", "age", "age_gender", "country"]),
  rangeDays: z.number().int(),
  entityId: z.string().uuid().nullable(),
  breakdown: z.array(z.record(z.unknown())),
};
const SATURATION_OUTPUT_SCHEMA = {
  accountId: z.string().uuid(),
  entity: z.record(z.unknown()),
  rangeDays: z.number().int(),
  frequency: z.array(z.record(z.unknown())),
};
const TASKS_OUTPUT_SCHEMA = {
  accountId: z.string().uuid(),
  tasks: z.array(z.record(z.unknown())),
};
const CREATE_PROJECT_OUTPUT_SCHEMA = {
  project: z.record(z.unknown()),
};
const CREATE_TASK_OUTPUT_SCHEMA = {
  task: z.record(z.unknown()),
};
const AUTOMATION_OUTPUT_SCHEMA = {
  accountId: z.string().uuid(),
  entityId: z.string().uuid(),
  automation: z.record(z.unknown()),
};
const AUTOMATION_PROFILES_OUTPUT_SCHEMA = {
  accountId: z.string().uuid(),
  profiles: z.array(z.record(z.unknown())),
};
const AD_RUNTIME_OUTPUT_SCHEMA = {
  accountId: z.string().uuid(),
  ad: z.record(z.unknown()),
  firstRecordedDeliveryDate: z.string().nullable(),
  daysSinceFirstRecordedDelivery: z.number().int().nullable(),
  dateMeaning: z.string(),
};

const OAUTH_SECURITY_SCHEMES = [{ type: "oauth2", scopes: ["openid", "profile", "email"] }];

function authenticationRequired(challenge: string) {
  return {
    content: [{ type: "text" as const, text: "Authentication required. Connect your Kenoo account to continue." }],
    isError: true,
    _meta: { "mcp/www_authenticate": [challenge] },
  };
}

function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

async function resolveAccountId(identity: KenooIdentity) {
  if (!identity.clientId) return null;

  const { data, error } = await identity.supabase
    .from("account_authorizations")
    .select("account_id")
    .eq("user_id", identity.user.id)
    .eq("authorization_server", "supabase")
    .eq("client_id", identity.clientId)
    .eq("resource", "mcp")
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;

  return data?.account_id ?? null;
}

async function requireAccount(identity: KenooIdentity) {
  const accountId = await resolveAccountId(identity);
  if (!accountId) throw new Error("This connection does not have a selected Kenoo account.");
  return accountId;
}

async function requireAccountForApp(identity: KenooIdentity, appSlug: "projects" | "adpilot") {
  const accountId = await requireAccount(identity);
  const { data: app, error: appError } = await identity.supabase
    .from("apps")
    .select("id")
    .eq("slug", appSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (appError) throw appError;
  if (!app) throw new Error(`${appSlug} is not an active Kenoo app.`);

  const { data: grant, error: grantError } = await identity.supabase
    .from("account_app_user_access")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", identity.user.id)
    .eq("app_id", app.id)
    .maybeSingle();
  if (grantError) throw grantError;
  if (grant) return accountId;

  const { data: accountGrant, error: accountGrantError } = await identity.supabase
    .from("account_app_access")
    .select("id")
    .eq("account_id", accountId)
    .eq("app_id", app.id)
    .maybeSingle();
  if (accountGrantError) throw accountGrantError;
  if (accountGrant) return accountId;

  // Legacy users have a global app grant rather than per-account grants.
  const { data: accountGrants, error: accountGrantsError } = await identity.supabase
    .from("account_app_user_access")
    .select("id")
    .eq("user_id", identity.user.id)
    .limit(1);
  if (accountGrantsError) throw accountGrantsError;
  if (!(accountGrants ?? []).length) {
    const { data: legacyGrant, error: legacyError } = await identity.supabase
      .from("user_app_access")
      .select("id")
      .eq("user_id", identity.user.id)
      .eq("app_id", app.id)
      .maybeSingle();
    if (legacyError) throw legacyError;
    if (legacyGrant) return accountId;
  }

  throw new Error(`The selected account does not have access to ${appSlug}.`);
}

function rangeStartIso(rangeDays: number) {
  const start = new Date();
  start.setDate(start.getDate() - rangeDays);
  return start.toISOString().slice(0, 10);
}

function aggregateAdMetrics(rows: Array<Record<string, unknown>>) {
  type Totals = {
    spendMicros: number;
    impressions: number;
    clicks: number;
    conversionValueMicros: number;
    websitePurchases: number;
  };
  const totals = rows.reduce<Totals>(
    (result, row) => ({
      spendMicros: result.spendMicros + Number(row.spend_micros ?? 0),
      impressions: result.impressions + Number(row.impressions ?? 0),
      clicks: result.clicks + Number(row.clicks ?? 0),
      conversionValueMicros:
        result.conversionValueMicros + Number(row.conversion_value_micros ?? 0),
      websitePurchases: result.websitePurchases + Number(row.website_purchases ?? 0),
    }),
    {
      spendMicros: 0,
      impressions: 0,
      clicks: 0,
      conversionValueMicros: 0,
      websitePurchases: 0,
    },
  );
  const spend = totals.spendMicros / 1_000_000;
  return {
    ...totals,
    ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0,
    roas: spend ? totals.conversionValueMicros / 1_000_000 / spend : null,
    cpa: totals.websitePurchases ? spend / totals.websitePurchases : null,
  };
}

type AutomationSettings = {
  aggressiveness: number;
  maxDailyIncreasePct: number;
  maxDailyDecreasePct: number;
  roasFloor: number | null;
  roasFloorInputMode: "direct" | "margin";
  contributionMarginPct: number | null;
  ctrFloorPct: number | null;
  cpaCeiling: number | null;
  roasFloorActions: Array<"stop_campaign" | "email_alert">;
  cooldownHours: number;
  learningPhaseProtection: boolean;
  pauseOnFatigue: boolean;
};

const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  aggressiveness: 3,
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

const AUTOMATION_PROFILE_SELECT =
  "id, name, description, is_default, optimization_goal, settings";
const AUTOMATION_SELECT =
  "enabled, profile_id, settings_override, cooldown_hours, min_daily_budget_micros, max_daily_budget_micros, automation_status, last_reviewed_at, last_adjusted_at, last_error";

function normalizeAutomationSettings(raw: unknown): AutomationSettings {
  const input = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const settings = { ...DEFAULT_AUTOMATION_SETTINGS } as AutomationSettings;
  for (const key of Object.keys(DEFAULT_AUTOMATION_SETTINGS) as Array<keyof AutomationSettings>) {
    if (key in input) (settings[key] as unknown) = input[key];
  }
  settings.aggressiveness = Math.min(5, Math.max(1, Math.round(Number(settings.aggressiveness) || 3)));
  settings.cooldownHours = [24, 48, 72].reduce((best, option) =>
    Math.abs(option - Number(settings.cooldownHours)) < Math.abs(best - Number(settings.cooldownHours)) ? option : best,
  24);
  settings.roasFloorActions = Array.isArray(settings.roasFloorActions)
    ? settings.roasFloorActions.filter((value): value is "stop_campaign" | "email_alert" => value === "stop_campaign" || value === "email_alert")
    : [...DEFAULT_AUTOMATION_SETTINGS.roasFloorActions];
  settings.roasFloorInputMode = settings.roasFloorInputMode === "margin" ? "margin" : "direct";
  return settings;
}

function automationSettingsOverride(base: AutomationSettings, next: AutomationSettings) {
  const override: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_AUTOMATION_SETTINGS) as Array<keyof AutomationSettings>) {
    if (key === "cooldownHours") continue;
    if (JSON.stringify(base[key]) !== JSON.stringify(next[key])) override[key] = next[key];
  }
  return override;
}

function validateAutomationSettings(settings: AutomationSettings, entity: { provider: string; objective: string | null }) {
  const provider = entity.provider.toLowerCase();
  const objective = (entity.objective ?? "").toUpperCase();
  const salesContext = provider === "meta"
    ? objective.includes("SALES") || objective.includes("CONVERSION") || objective.includes("CATALOG")
    : provider === "google"
      ? objective.includes("SALES") || objective.includes("SHOPPING") || objective.includes("REVENUE")
      : false;
  const stopLoss = salesContext ? settings.roasFloor : settings.cpaCeiling ?? settings.ctrFloorPct;
  if (stopLoss != null && (!Number.isFinite(Number(stopLoss)) || Number(stopLoss) < 0)) {
    throw new Error("Stop-loss value must be zero or greater.");
  }
  if (salesContext && settings.roasFloorInputMode === "margin" &&
      (settings.contributionMarginPct == null || settings.contributionMarginPct < 1 || settings.contributionMarginPct > 100)) {
    throw new Error("Profit kept per sale must be between 1% and 100%.");
  }
}

function mapAutomation(row: Record<string, unknown> | null, profile: Record<string, unknown> | null) {
  const override = row?.settings_override && typeof row.settings_override === "object"
    ? row.settings_override as Record<string, unknown>
    : {};
  const base = normalizeAutomationSettings(profile?.settings);
  const effectiveSettings = normalizeAutomationSettings({
    ...base,
    ...override,
    cooldownHours: row?.cooldown_hours ?? base.cooldownHours,
  });
  return {
    enabled: Boolean(row?.enabled),
    profileId: (row?.profile_id as string | null) ?? (profile?.id as string | null) ?? null,
    settingsOverride: override,
    effectiveSettings,
    cooldownHours: row?.cooldown_hours == null ? null : effectiveSettings.cooldownHours,
    minDailyBudgetMicros: (row?.min_daily_budget_micros as number | null) ?? null,
    maxDailyBudgetMicros: (row?.max_daily_budget_micros as number | null) ?? null,
    automationStatus: (row?.automation_status as string | null) ?? "inactive",
    lastReviewedAt: (row?.last_reviewed_at as string | null) ?? null,
    lastAdjustedAt: (row?.last_adjusted_at as string | null) ?? null,
    lastError: (row?.last_error as string | null) ?? null,
  };
}

async function getAutomationProfile(identity: KenooIdentity, accountId: string, profileId?: string | null) {
  let query = identity.supabase.from("ad_automation_profiles").select(AUTOMATION_PROFILE_SELECT).eq("account_id", accountId);
  query = profileId ? query.eq("id", profileId) : query.eq("is_default", true);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

async function listAdPerformance(
  identity: KenooIdentity,
  input: { entityType: "campaign" | "ad_group" | "ad"; rangeDays: number; search?: string; limit: number },
) {
  const accountId = await requireAccountForApp(identity, "adpilot");
  const since = rangeStartIso(input.rangeDays);
  let entityQuery = identity.supabase
    .from("ad_entities")
    .select("id, entity_type, name, provider, status, objective, parent_id, daily_budget_micros, learning_status, lifetime_reach, estimated_audience_lower, estimated_audience_upper, audience_estimate_ready")
    .eq("account_id", accountId)
    .eq("entity_type", input.entityType)
    .order("name")
    .limit(500);
  if (input.search?.trim()) entityQuery = entityQuery.ilike("name", `%${input.search.trim()}%`);
  const { data: entities, error: entityError } = await entityQuery;
  if (entityError) throw entityError;
  const entityIds = (entities ?? []).map((row) => row.id as string);
  if (!entityIds.length) return { accountId, rangeDays: input.rangeDays, entities: [] };

  const { data: metricRows, error: metricError } = await identity.supabase
    .from("ad_metrics_daily")
    .select("entity_id, spend_micros, impressions, clicks, conversion_value_micros, website_purchases")
    .eq("account_id", accountId)
    .in("entity_id", entityIds)
    .gte("metric_date", since);
  if (metricError) throw metricError;

  const metricsByEntity = new Map<string, Array<Record<string, unknown>>>();
  for (const row of metricRows ?? []) {
    const id = row.entity_id as string;
    metricsByEntity.set(id, [...(metricsByEntity.get(id) ?? []), row]);
  }
  const rows = (entities ?? []).map((entity) => ({
    id: entity.id,
    entityType: entity.entity_type,
    name: entity.name ?? "Untitled",
    provider: entity.provider,
    status: entity.status,
    objective: entity.objective,
    parentId: entity.parent_id,
    dailyBudgetMicros: entity.daily_budget_micros,
    learningStatus: entity.learning_status,
    reachSaturation: {
      lifetimeReach: entity.lifetime_reach,
      estimatedAudienceLower: entity.estimated_audience_lower,
      estimatedAudienceUpper: entity.estimated_audience_upper,
      audienceEstimateReady: entity.audience_estimate_ready,
    },
    metrics: aggregateAdMetrics(metricsByEntity.get(entity.id as string) ?? []),
  }));
  rows.sort((a, b) => (b.metrics.roas ?? -1) - (a.metrics.roas ?? -1) || b.metrics.spendMicros - a.metrics.spendMicros);
  return { accountId, rangeDays: input.rangeDays, entities: rows.slice(0, input.limit) };
}

async function listAccessibleProjectIds(identity: KenooIdentity, accountId: string) {
  const { data: owned, error: ownedError } = await identity.supabase
    .from("projects").select("id").eq("account_id", accountId).eq("owner_id", identity.user.id);
  if (ownedError) throw ownedError;
  const { data: memberships, error: memberError } = await identity.supabase
    .from("project_members").select("project_id, projects!inner(account_id)").eq("user_id", identity.user.id);
  if (memberError) throw memberError;
  return [...new Set([...(owned ?? []).map((row) => row.id as string), ...(memberships ?? []).filter((row) => (row.projects as { account_id?: string } | null)?.account_id === accountId).map((row) => row.project_id as string)])];
}

export function createKenooMcpServer(identity: KenooIdentity | null, authChallenge: string) {
  const server = new McpServer({ name: "kenoo-mcp", version: "0.1.0" });

  server.registerTool(
    "kenoo_get_current_user",
    {
      title: "Get current Kenoo user",
      description: "Return the identity associated with the authenticated Kenoo account.",
      annotations: { readOnlyHint: true },
      // SDK v1 forwards custom metadata; the explicit tools/list response below
      // adds this as a top-level field for clients that support the current spec.
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {},
      outputSchema: CURRENT_USER_OUTPUT_SCHEMA,
    },
    async () => {
      if (!identity) return authenticationRequired(authChallenge);
      return text({
        id: identity.user.id,
        email: identity.user.email ?? null,
        createdAt: identity.user.created_at,
      });
    },
  );

  server.registerTool(
    "kenoo_list_my_accounts",
    {
      title: "Get connected Kenoo account",
      description: "Return the single Kenoo account selected when this connection was authorized.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {},
      outputSchema: CONNECTED_ACCOUNT_OUTPUT_SCHEMA,
    },
    async () => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await resolveAccountId(identity);
      return text({ accountId, connected: Boolean(accountId) });
    },
  );

  server.registerTool(
    "kenoo_list_projects",
    {
      title: "List my projects",
      description:
        "List projects the authenticated user owns or belongs to. Results are scoped to the Kenoo account selected during authorization.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Maximum projects to return. Defaults to 25."),
      },
      outputSchema: PROJECTS_OUTPUT_SCHEMA,
    },
    async ({ limit = 25 }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await resolveAccountId(identity);
      if (!accountId) {
        return text({ projects: [], message: "This connection does not have a selected Kenoo account." });
      }

      const { data: memberRows, error: memberError } = await identity.supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", identity.user.id);
      if (memberError) throw memberError;

      const memberProjectIds = (memberRows ?? []).map((row) => row.project_id);
      const accessFilter = memberProjectIds.length
        ? `owner_id.eq.${identity.user.id},id.in.(${memberProjectIds.join(",")})`
        : `owner_id.eq.${identity.user.id}`;
      const { data, error } = await identity.supabase
        .from("projects")
        .select("id, name, slug, description, status, start_date, due_date, completed_at, owner_id, account_id, priority, color, created_at, updated_at")
        .eq("account_id", accountId)
        .or(accessFilter)
        .order("name")
        .limit(limit);

      if (error) throw error;
      return text({ accountId, projects: data ?? [] });
    },
  );

  server.registerTool(
    "adpilot_list_entities",
    {
      title: "List AdPilot performance",
      description: "List campaigns, ad sets, or ads for the selected account with aggregated performance for the requested period. Use rangeDays=1 for the latest daily window or 7 for the last seven days.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {
        entityType: z.enum(["campaign", "ad_group", "ad"]).default("campaign"),
        rangeDays: z.number().int().min(1).max(90).default(7),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
      },
      outputSchema: AD_PERFORMANCE_OUTPUT_SCHEMA,
    },
    async ({ entityType = "campaign", rangeDays = 7, search, limit = 25 }) => {
      if (!identity) return authenticationRequired(authChallenge);
      return text(await listAdPerformance(identity, { entityType, rangeDays, search, limit }));
    },
  );

  server.registerTool(
    "adpilot_get_best_performing_ads",
    {
      title: "Find best-performing ads",
      description: "Find the best-performing individual ads in the selected account, ranked by ROAS and spend for a daily or multi-day window.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {
        rangeDays: z.number().int().min(1).max(90).default(7),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(10),
      },
      outputSchema: AD_PERFORMANCE_OUTPUT_SCHEMA,
    },
    async ({ rangeDays = 7, search, limit = 10 }) => {
      if (!identity) return authenticationRequired(authChallenge);
      return text(await listAdPerformance(identity, { entityType: "ad", rangeDays, search, limit }));
    },
  );

  server.registerTool(
    "adpilot_get_audience_breakdown",
    {
      title: "Get AdPilot audience breakdown",
      description: "Return age, gender, age/gender, or country performance breakdowns. Pass entityId to inspect a specific campaign, ad set, or ad; omit it for the connected account.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {
        breakdownType: z.enum(["gender", "age", "age_gender", "country"]).default("gender"),
        rangeDays: z.number().int().min(1).max(90).default(30),
        entityId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(100),
      },
      outputSchema: AUDIENCE_BREAKDOWN_OUTPUT_SCHEMA,
    },
    async ({ breakdownType = "gender", rangeDays = 30, entityId, limit = 100 }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "adpilot");
      const since = rangeStartIso(rangeDays);
      let query = identity.supabase.from("ad_metrics_daily_breakdowns")
        .select("entity_id, age, gender, country, impressions, clicks, spend_micros, conversion_value_micros, website_purchases")
        .eq("account_id", accountId).eq("breakdown_type", breakdownType).gte("metric_date", since).limit(5000);
      if (entityId) query = query.eq("entity_id", entityId);
      const { data, error } = await query;
      if (error) throw error;
      const buckets = new Map<string, Record<string, number>>();
      for (const row of data ?? []) {
        const key = breakdownType === "age" ? row.age : breakdownType === "gender" ? row.gender : breakdownType === "country" ? row.country : `${row.age}:${row.gender}`;
        const current = buckets.get(key || "unknown") ?? { impressions: 0, clicks: 0, spendMicros: 0, conversionValueMicros: 0, websitePurchases: 0 };
        current.impressions += Number(row.impressions ?? 0); current.clicks += Number(row.clicks ?? 0); current.spendMicros += Number(row.spend_micros ?? 0); current.conversionValueMicros += Number(row.conversion_value_micros ?? 0); current.websitePurchases += Number(row.website_purchases ?? 0);
        buckets.set(key || "unknown", current);
      }
      const breakdown = [...buckets.entries()].map(([key, metrics]) => ({
        key,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        spendMicros: metrics.spendMicros,
        conversionValueMicros: metrics.conversionValueMicros,
        websitePurchases: metrics.websitePurchases,
        ctr: metrics.impressions ? metrics.clicks / metrics.impressions * 100 : 0,
        roas: metrics.spendMicros ? metrics.conversionValueMicros / metrics.spendMicros : null,
      })).sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1) || b.spendMicros - a.spendMicros).slice(0, limit);
      return text({ accountId, breakdownType, rangeDays, entityId: entityId ?? null, breakdown });
    },
  );

  server.registerTool(
    "adpilot_get_saturation",
    {
      title: "Get AdPilot saturation",
      description: "Return reach, estimated audience size, and frequency distribution for a campaign, ad set, or ad.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: { entityId: z.string().uuid(), rangeDays: z.number().int().min(1).max(30).default(7) },
      outputSchema: SATURATION_OUTPUT_SCHEMA,
    },
    async ({ entityId, rangeDays = 7 }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "adpilot");
      const [{ data: entity, error: entityError }, { data: frequency, error: frequencyError }] = await Promise.all([
        identity.supabase.from("ad_entities").select("id, name, entity_type, status, lifetime_reach, lifetime_spend_micros, estimated_audience_lower, estimated_audience_upper, audience_estimate_ready").eq("account_id", accountId).eq("id", entityId).maybeSingle(),
        identity.supabase.from("ad_metrics_frequency_breakdowns").select("frequency_value, reach").eq("account_id", accountId).eq("entity_id", entityId).eq("range_days", rangeDays),
      ]);
      if (entityError) throw entityError; if (frequencyError) throw frequencyError;
      if (!entity) return toolError("Entity not found");
      return text({ accountId, entity, rangeDays, frequency: frequency ?? [] });
    },
  );

  server.registerTool(
    "adpilot_list_automation_profiles",
    {
      title: "List AdPilot automation profiles",
      description: "List the approved AdPilot rule profiles available to the selected account.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {},
      outputSchema: AUTOMATION_PROFILES_OUTPUT_SCHEMA,
    },
    async () => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "adpilot");
      const { data, error } = await identity.supabase
        .from("ad_automation_profiles")
        .select(AUTOMATION_PROFILE_SELECT)
        .eq("account_id", accountId)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return text({
        accountId,
        profiles: (data ?? []).map((profile) => ({
          id: profile.id,
          name: profile.name,
          description: profile.description,
          isDefault: Boolean(profile.is_default),
          optimizationGoal: profile.optimization_goal,
          settings: normalizeAutomationSettings(profile.settings),
        })),
      });
    },
  );

  server.registerTool(
    "adpilot_get_automation",
    {
      title: "Get AdPilot automation",
      description: "Inspect the current AdPilot rules and enablement state for a campaign or ad set.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: { entityId: z.string().uuid() },
      outputSchema: AUTOMATION_OUTPUT_SCHEMA,
    },
    async ({ entityId }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "adpilot");
      const { data: entity, error: entityError } = await identity.supabase
        .from("ad_entities")
        .select("id, entity_type")
        .eq("account_id", accountId)
        .eq("id", entityId)
        .maybeSingle();
      if (entityError) throw entityError;
      if (!entity) return toolError("Entity not found");
      if (entity.entity_type !== "campaign" && entity.entity_type !== "ad_group") {
        return toolError("Only campaigns and ad sets support AdPilot budget automation.");
      }

      const { data: row, error } = await identity.supabase
        .from("ad_entity_automation")
        .select(AUTOMATION_SELECT)
        .eq("account_id", accountId)
        .eq("entity_id", entityId)
        .maybeSingle();
      if (error) throw error;
      const profile = row?.profile_id ? await getAutomationProfile(identity, accountId, row.profile_id) : null;
      return text({ accountId, entityId, automation: mapAutomation(row, profile) });
    },
  );

  server.registerTool(
    "adpilot_set_automation",
    {
      title: "Set AdPilot automation",
      description: "Enable, disable, or update the approved AdPilot rules for a campaign or ad set. This changes automation behavior but does not directly change provider delivery settings.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: {
        entityId: z.string().uuid(),
        enabled: z.boolean().optional(),
        profileId: z.string().uuid().nullable().optional(),
        settingsOverride: z.object({
          aggressiveness: z.number().int().min(1).max(5).optional(),
          maxDailyIncreasePct: z.number().min(0).max(100).optional(),
          maxDailyDecreasePct: z.number().min(0).max(100).optional(),
          roasFloor: z.number().min(0).nullable().optional(),
          roasFloorInputMode: z.enum(["direct", "margin"]).optional(),
          contributionMarginPct: z.number().min(1).max(100).nullable().optional(),
          ctrFloorPct: z.number().min(0).nullable().optional(),
          cpaCeiling: z.number().min(0).nullable().optional(),
          roasFloorActions: z.array(z.enum(["stop_campaign", "email_alert"])).optional(),
          learningPhaseProtection: z.boolean().optional(),
          pauseOnFatigue: z.boolean().optional(),
        }).partial().optional(),
        cooldownHours: z.union([z.literal(24), z.literal(48), z.literal(72)]).nullable().optional(),
        minDailyBudgetMicros: z.number().int().nonnegative().nullable().optional(),
        maxDailyBudgetMicros: z.number().int().nonnegative().nullable().optional(),
      },
      outputSchema: AUTOMATION_OUTPUT_SCHEMA,
    },
    async ({ entityId, enabled, profileId, settingsOverride, cooldownHours, minDailyBudgetMicros, maxDailyBudgetMicros }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "adpilot");
      const { data: entity, error: entityError } = await identity.supabase
        .from("ad_entities")
        .select("id, entity_type, provider, objective, account_connection_id")
        .eq("account_id", accountId)
        .eq("id", entityId)
        .maybeSingle();
      if (entityError) throw entityError;
      if (!entity) return toolError("Entity not found");
      if (entity.entity_type !== "campaign" && entity.entity_type !== "ad_group") {
        return toolError("Only campaigns and ad sets support AdPilot budget automation.");
      }
      if (minDailyBudgetMicros != null && maxDailyBudgetMicros != null && minDailyBudgetMicros > maxDailyBudgetMicros) {
        return toolError("Minimum daily budget cannot exceed maximum daily budget.");
      }

      const { data: existing, error: existingError } = await identity.supabase
        .from("ad_entity_automation")
        .select(AUTOMATION_SELECT)
        .eq("account_id", accountId)
        .eq("entity_id", entityId)
        .maybeSingle();
      if (existingError) throw existingError;

      const profile = await getAutomationProfile(identity, accountId, profileId !== undefined ? profileId : existing?.profile_id as string | null | undefined);
      if ((enabled ?? existing?.enabled ?? false) && !profile) {
        return toolError("No AdPilot automation profile is available for this account.");
      }
      const baseSettings = normalizeAutomationSettings(profile?.settings);
      const mergedSettings = normalizeAutomationSettings({
        ...baseSettings,
        ...(existing?.settings_override && typeof existing.settings_override === "object" ? existing.settings_override : {}),
        ...(settingsOverride ?? {}),
        cooldownHours: cooldownHours ?? existing?.cooldown_hours ?? baseSettings.cooldownHours,
      });
      validateAutomationSettings(mergedSettings, { provider: entity.provider, objective: entity.objective });
      const settingsToPersist = automationSettingsOverride(baseSettings, mergedSettings);

      const nextEnabled = enabled ?? Boolean(existing?.enabled);
      const { data: updated, error: updateError } = await identity.supabase
        .from("ad_entity_automation")
        .upsert({
          account_id: accountId,
          account_connection_id: entity.account_connection_id,
          entity_id: entityId,
          enabled: nextEnabled,
          profile_id: profile?.id ?? null,
          settings_override: settingsToPersist,
          cooldown_hours: cooldownHours !== undefined ? cooldownHours : existing?.cooldown_hours ?? null,
          min_daily_budget_micros: minDailyBudgetMicros !== undefined ? minDailyBudgetMicros : existing?.min_daily_budget_micros ?? null,
          max_daily_budget_micros: maxDailyBudgetMicros !== undefined ? maxDailyBudgetMicros : existing?.max_daily_budget_micros ?? null,
          automation_status: nextEnabled ? (existing?.automation_status && existing.automation_status !== "inactive" ? existing.automation_status : "active") : "inactive",
          updated_at: new Date().toISOString(),
        }, { onConflict: "entity_id" })
        .select(AUTOMATION_SELECT)
        .single();
      if (updateError) throw updateError;
      return text({ accountId, entityId, automation: mapAutomation(updated, profile) });
    },
  );

  server.registerTool(
    "adpilot_get_ad_runtime",
    {
      title: "Get ad runtime",
      description: "Find the earliest recorded delivery date for an ad and how many days ago that was. This is based on Kenoo's daily metrics history, so it may be later than the ad's true launch date.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: { adId: z.string().uuid() },
      outputSchema: AD_RUNTIME_OUTPUT_SCHEMA,
    },
    async ({ adId }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "adpilot");
      const { data: ad, error: adError } = await identity.supabase
        .from("ad_entities")
        .select("id, name, provider, provider_entity_id, status, start_date, last_synced_at")
        .eq("account_id", accountId)
        .eq("id", adId)
        .eq("entity_type", "ad")
        .maybeSingle();
      if (adError) throw adError;
      if (!ad) return toolError("Ad not found");

      const { data: firstMetric, error: metricError } = await identity.supabase
        .from("ad_metrics_daily")
        .select("metric_date")
        .eq("account_id", accountId)
        .eq("entity_id", adId)
        .gt("impressions", 0)
        .order("metric_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (metricError) throw metricError;

      const firstRecordedDeliveryDate = firstMetric?.metric_date ?? ad.start_date ?? null;
      const today = new Date();
      const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      const firstDate = firstRecordedDeliveryDate ? new Date(`${firstRecordedDeliveryDate}T00:00:00Z`) : null;
      const daysSinceFirstRecordedDelivery = firstDate && Number.isFinite(firstDate.getTime())
        ? Math.max(0, Math.floor((todayUtc - firstDate.getTime()) / 86_400_000))
        : null;
      return text({
        accountId,
        ad: { id: ad.id, name: ad.name, provider: ad.provider, providerEntityId: ad.provider_entity_id, status: ad.status },
        firstRecordedDeliveryDate,
        daysSinceFirstRecordedDelivery,
        dateMeaning: firstMetric
          ? "Earliest day with recorded impressions in Kenoo's available metrics history; the ad may have started earlier."
          : ad.start_date
            ? "Scheduled start date from the ad record; it may not be the first day the ad actually delivered."
            : "No delivery date is available in the ad record or daily metrics history.",
      });
    },
  );

  server.registerTool(
    "adpilot_set_ad_delivery_status",
    {
      title: "Activate or pause an ad",
      description: "Activate or pause the selected ad on its connected Meta or Google Ads account. This changes the ad's actual provider delivery status.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: { adId: z.string().uuid(), status: z.enum(["ACTIVE", "PAUSED"]) },
      outputSchema: { accountId: z.string().uuid(), adId: z.string().uuid(), status: z.string(), providerResult: z.record(z.unknown()) },
    },
    async ({ adId, status }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "adpilot");
      const adpilotApiUrl = process.env.MCP_ADPILOT_API_URL?.trim().replace(/\/$/, "")
        || (process.env.NODE_ENV === "production" ? "https://adpilot.kenoo.io" : "http://localhost:3001");
      const response = await fetch(`${adpilotApiUrl}/api/mcp/ad-delivery-status`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${identity.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ adId, status }),
      });
      const result = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) return toolError(typeof result.error === "string" ? result.error : "Unable to update ad delivery status.");
      return text({ accountId, adId, status: result.status, providerResult: (result.providerResult as Record<string, unknown>) ?? {} });
    },
  );

  server.registerTool(
    "kenoo_list_tasks",
    {
      title: "List project tasks",
      description: "List tasks visible to the authenticated user in the selected Kenoo account.",
      annotations: { readOnlyHint: true },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: { projectId: z.string().uuid().optional(), status: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) },
      outputSchema: TASKS_OUTPUT_SCHEMA,
    },
    async ({ projectId, status, limit = 50 }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "projects");
      const projectIds = projectId ? [projectId] : await listAccessibleProjectIds(identity, accountId);
      if (!projectIds.length) return text({ accountId, tasks: [] });
      let query = identity.supabase.from("project_tasks").select("id, project_id, parent_task_id, title, description, status, start_date, due_date, priority, position, estimated_minutes, actual_minutes, is_private, created_at, updated_at, completed_at").in("project_id", projectIds).order("updated_at", { ascending: false }).limit(limit);
      if (status) query = query.eq("status", status);
      const { data, error } = await query; if (error) throw error;
      return text({ accountId, tasks: data ?? [] });
    },
  );

  server.registerTool(
    "kenoo_create_project",
    {
      title: "Create project",
      description: "Create a project in the selected Kenoo account. This is a write operation and should only be used when explicitly requested.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: { name: z.string().min(1).max(200), description: z.string().max(5000).optional(), status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).default("planning"), dueDate: z.string().optional() },
      outputSchema: CREATE_PROJECT_OUTPUT_SCHEMA,
    },
    async ({ name, description, status = "planning", dueDate }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "projects");
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70)}-${crypto.randomUUID().slice(0, 8)}`;
      const { data, error } = await identity.supabase.from("projects").insert({ account_id: accountId, owner_id: identity.user.id, name, slug, description: description ?? null, status, due_date: dueDate ?? null }).select("id, name, slug, description, status, due_date, owner_id, account_id, created_at, updated_at").single();
      if (error) throw error;
      return text({ project: data });
    },
  );

  server.registerTool(
    "kenoo_create_task",
    {
      title: "Create project task",
      description: "Create a task in a project the authenticated user can access.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      inputSchema: { projectId: z.string().uuid(), title: z.string().min(1).max(300), description: z.string().max(10000).optional(), status: z.enum(["todo", "in_progress", "in_review", "on_hold", "blocked", "completed", "cancelled"]).default("todo"), dueDate: z.string().optional(), priority: z.number().int().min(0).max(5).optional() },
      outputSchema: CREATE_TASK_OUTPUT_SCHEMA,
    },
    async ({ projectId, title, description, status = "todo", dueDate, priority }) => {
      if (!identity) return authenticationRequired(authChallenge);
      const accountId = await requireAccountForApp(identity, "projects");
      const projectIds = await listAccessibleProjectIds(identity, accountId);
      if (!projectIds.includes(projectId)) return toolError("Project not found or not accessible");
      const { data, error } = await identity.supabase.from("project_tasks").insert({ project_id: projectId, title, description: description ?? null, status, due_date: dueDate ?? null, priority: priority ?? null, assigned_by: identity.user.id, is_private: false }).select("id, project_id, title, description, status, due_date, priority, created_at, updated_at").single();
      if (error) throw error;
      return text({ task: data });
    },
  );

  // @modelcontextprotocol/sdk v1 does not yet expose `securitySchemes` in its
  // registerTool type, so add the standards field at the wire boundary while
  // retaining `_meta.securitySchemes` for older clients.
  server.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [
      {
        name: "kenoo_get_current_user",
        title: "Get current Kenoo user",
        description: "Return the identity associated with the authenticated Kenoo account.",
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object", properties: { id: { type: "string" }, email: { type: ["string", "null"] }, createdAt: { type: ["string", "null"] } }, required: ["id", "email", "createdAt"] },
        annotations: { readOnlyHint: true },
        securitySchemes: OAUTH_SECURITY_SCHEMES,
        _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "kenoo_list_my_accounts",
        title: "Get connected Kenoo account",
        description: "Return the single Kenoo account selected when this connection was authorized.",
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object", properties: { accountId: { type: ["string", "null"], format: "uuid" }, connected: { type: "boolean" } }, required: ["accountId", "connected"] },
        annotations: { readOnlyHint: true },
        securitySchemes: OAUTH_SECURITY_SCHEMES,
        _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "kenoo_list_projects",
        title: "List my projects",
        description: "List projects the authenticated user owns or belongs to. Results are scoped to the Kenoo account selected during authorization.",
        inputSchema: {
          type: "object",
          properties: { limit: { type: "integer", minimum: 1, maximum: 100 } },
        },
        outputSchema: { type: "object", properties: { accountId: { type: ["string", "null"], format: "uuid" }, projects: { type: "array", items: { type: "object", additionalProperties: true } }, message: { type: "string" } }, required: ["accountId", "projects"] },
        annotations: { readOnlyHint: true },
        securitySchemes: OAUTH_SECURITY_SCHEMES,
        _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_list_entities",
        title: "List AdPilot performance",
        description: "List campaigns, ad sets, or ads with aggregated performance for a requested period.",
        inputSchema: { type: "object", properties: { entityType: { type: "string", enum: ["campaign", "ad_group", "ad"], default: "campaign" }, rangeDays: { type: "integer", minimum: 1, maximum: 90, default: 7 }, search: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100, default: 25 } } },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, rangeDays: { type: "integer" }, entities: { type: "array", items: { type: "object", additionalProperties: true } } }, required: ["accountId", "rangeDays", "entities"] },
        annotations: { readOnlyHint: true }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_get_best_performing_ads",
        title: "Find best-performing ads",
        description: "Find the best-performing individual ads ranked by ROAS and spend.",
        inputSchema: { type: "object", properties: { rangeDays: { type: "integer", minimum: 1, maximum: 90, default: 7 }, search: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100, default: 10 } } },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, rangeDays: { type: "integer" }, entities: { type: "array", items: { type: "object", additionalProperties: true } } }, required: ["accountId", "rangeDays", "entities"] },
        annotations: { readOnlyHint: true }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_get_audience_breakdown",
        title: "Get AdPilot audience breakdown",
        description: "Return age, gender, age/gender, or country performance breakdowns.",
        inputSchema: { type: "object", properties: { breakdownType: { type: "string", enum: ["gender", "age", "age_gender", "country"], default: "gender" }, rangeDays: { type: "integer", minimum: 1, maximum: 90, default: 30 }, entityId: { type: "string", format: "uuid" }, limit: { type: "integer", minimum: 1, maximum: 100, default: 100 } } },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, breakdownType: { type: "string", enum: ["gender", "age", "age_gender", "country"] }, rangeDays: { type: "integer" }, entityId: { type: ["string", "null"], format: "uuid" }, breakdown: { type: "array", items: { type: "object", additionalProperties: true } } }, required: ["accountId", "breakdownType", "rangeDays", "entityId", "breakdown"] },
        annotations: { readOnlyHint: true }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_get_saturation",
        title: "Get AdPilot saturation",
        description: "Return reach, estimated audience size, and frequency distribution for an entity.",
        inputSchema: { type: "object", properties: { entityId: { type: "string", format: "uuid" }, rangeDays: { type: "integer", minimum: 1, maximum: 30, default: 7 } }, required: ["entityId"] },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, entity: { type: "object", additionalProperties: true }, rangeDays: { type: "integer" }, frequency: { type: "array", items: { type: "object", additionalProperties: true } } }, required: ["accountId", "entity", "rangeDays", "frequency"] },
        annotations: { readOnlyHint: true }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_list_automation_profiles",
        title: "List AdPilot automation profiles",
        description: "List the approved AdPilot rule profiles available to the selected account.",
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, profiles: { type: "array", items: { type: "object", additionalProperties: true } } }, required: ["accountId", "profiles"] },
        annotations: { readOnlyHint: true }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_get_automation",
        title: "Get AdPilot automation",
        description: "Inspect the current AdPilot rules and enablement state for a campaign or ad set.",
        inputSchema: { type: "object", properties: { entityId: { type: "string", format: "uuid" } }, required: ["entityId"] },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, entityId: { type: "string", format: "uuid" }, automation: { type: "object", additionalProperties: true } }, required: ["accountId", "entityId", "automation"] },
        annotations: { readOnlyHint: true }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_set_automation",
        title: "Set AdPilot automation",
        description: "Enable, disable, or update the approved AdPilot rules for a campaign or ad set.",
        inputSchema: {
          type: "object",
          properties: {
            entityId: { type: "string", format: "uuid" },
            enabled: { type: "boolean" },
            profileId: { type: ["string", "null"], format: "uuid" },
            settingsOverride: { type: "object", additionalProperties: true },
            cooldownHours: { type: ["integer", "null"], enum: [24, 48, 72, null] },
            minDailyBudgetMicros: { type: ["integer", "null"], minimum: 0 },
            maxDailyBudgetMicros: { type: ["integer", "null"], minimum: 0 },
          },
          required: ["entityId"],
        },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, entityId: { type: "string", format: "uuid" }, automation: { type: "object", additionalProperties: true } }, required: ["accountId", "entityId", "automation"] },
        annotations: { readOnlyHint: false, destructiveHint: false }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_get_ad_runtime",
        title: "Get ad runtime",
        description: "Find an ad's earliest recorded delivery date and the number of days since. Based on Kenoo's available daily metrics history.",
        inputSchema: { type: "object", properties: { adId: { type: "string", format: "uuid" } }, required: ["adId"] },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, ad: { type: "object", additionalProperties: true }, firstRecordedDeliveryDate: { type: ["string", "null"] }, daysSinceFirstRecordedDelivery: { type: ["integer", "null"] }, dateMeaning: { type: "string" } }, required: ["accountId", "ad", "firstRecordedDeliveryDate", "daysSinceFirstRecordedDelivery", "dateMeaning"] },
        annotations: { readOnlyHint: true }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "adpilot_set_ad_delivery_status",
        title: "Activate or pause an ad",
        description: "Activate or pause the selected ad on its connected Meta or Google Ads account. This changes the ad's actual provider delivery status.",
        inputSchema: { type: "object", properties: { adId: { type: "string", format: "uuid" }, status: { type: "string", enum: ["ACTIVE", "PAUSED"] } }, required: ["adId", "status"] },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, adId: { type: "string", format: "uuid" }, status: { type: "string" }, providerResult: { type: "object", additionalProperties: true } }, required: ["accountId", "adId", "status", "providerResult"] },
        annotations: { readOnlyHint: false, destructiveHint: false }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "kenoo_list_tasks",
        title: "List project tasks",
        description: "List tasks visible to the authenticated user in the selected account.",
        inputSchema: { type: "object", properties: { projectId: { type: "string", format: "uuid" }, status: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100, default: 50 } } },
        outputSchema: { type: "object", properties: { accountId: { type: "string", format: "uuid" }, tasks: { type: "array", items: { type: "object", additionalProperties: true } } }, required: ["accountId", "tasks"] },
        annotations: { readOnlyHint: true }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "kenoo_create_project",
        title: "Create project",
        description: "Create a project in the selected Kenoo account.",
        inputSchema: { type: "object", properties: { name: { type: "string", minLength: 1, maxLength: 200 }, description: { type: "string", maxLength: 5000 }, status: { type: "string", enum: ["planning", "active", "on_hold", "completed", "cancelled"], default: "planning" }, dueDate: { type: "string" } }, required: ["name"] },
        outputSchema: { type: "object", properties: { project: { type: "object", additionalProperties: true } }, required: ["project"] },
        annotations: { readOnlyHint: false, destructiveHint: false }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
      {
        name: "kenoo_create_task",
        title: "Create project task",
        description: "Create a task in a project the authenticated user can access.",
        inputSchema: { type: "object", properties: { projectId: { type: "string", format: "uuid" }, title: { type: "string", minLength: 1, maxLength: 300 }, description: { type: "string", maxLength: 10000 }, status: { type: "string", enum: ["todo", "in_progress", "in_review", "on_hold", "blocked", "completed", "cancelled"], default: "todo" }, dueDate: { type: "string" }, priority: { type: "integer", minimum: 0, maximum: 5 } }, required: ["projectId", "title"] },
        outputSchema: { type: "object", properties: { task: { type: "object", additionalProperties: true } }, required: ["task"] },
        annotations: { readOnlyHint: false, destructiveHint: false }, securitySchemes: OAUTH_SECURITY_SCHEMES, _meta: { securitySchemes: OAUTH_SECURITY_SCHEMES },
      },
    ],
  }) as unknown as ListToolsResult);

  return server;
}
