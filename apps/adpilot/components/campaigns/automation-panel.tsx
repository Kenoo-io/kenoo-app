"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2, Pencil, Plus, Shield, Trash2, X } from "lucide-react";

import { Button } from "@walls/ui/button";
import { Input } from "@walls/ui/input";
import { LabeledSwitch } from "@walls/ui/switch";
import { Textarea } from "@walls/ui/textarea";
import { cn } from "@walls/utils";

import { AdPilotPreviewCard } from "@/components/campaigns/adpilot-preview";
import {
  DetailSection,
  DetailSubLabel,
  detailSelectableClass,
} from "@/components/campaigns/entity-detail-shared";
import type { BudgetAdjustmentRow } from "@/lib/automation-server";
import {
  resolveInstructionStatus,
  type AgentInstruction,
  type AgentInstructionStatus,
} from "@/lib/agent-instructions";
import type { EntityDetailResult } from "@/lib/entity-detail-server";
import { formatCurrencyFromMicros } from "@/lib/format-analytics";
import {
  COOLDOWN_OPTIONS,
  OPTIMIZATION_GOAL_OPTIONS,
  optimizationGoalLabel,
  type AutomationStatus,
  type OptimizationGoal,
  type SpendAutomationSettings,
} from "@/lib/spend-automation-settings";

import { SliderField } from "@/components/ui/slider-field";
import { RoasFloorField } from "@/components/ui/roas-floor-field";
import {
  primaryButtonClass,
  secondaryButtonClass,
  segmentTrackClass,
  toggleChipActiveClass,
  toggleChipBaseClass,
  toggleChipInactiveClass,
} from "@/components/ui/button-styles";
import { SegmentThumb } from "@/components/settings/segment-thumb";

function automationStatusLabel(status: AutomationStatus): string {
  const labels: Record<AutomationStatus, string> = {
    inactive: "Inactive",
    active: "Active",
    paused: "Paused",
    cooldown: "Cooldown",
    learning: "Learning",
    error: "Error",
  };
  return labels[status];
}

function microsToDollars(micros: number | null): string {
  if (micros == null || micros <= 0) return "";
  return String(Math.round((micros / 1_000_000) * 100) / 100);
}

function dollarsToMicros(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 1_000_000);
}

function formatAdjustmentDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalValueToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function AdjustmentsList({ rows }: { rows: BudgetAdjustmentRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-light text-neutral-400">
        No budget adjustments yet. Changes will appear here once AdPilot runs.
      </p>
    );
  }

  return (
    <div className="divide-y divide-neutral-100">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-start justify-between gap-4 py-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-neutral-800">
              {row.previousDailyBudgetMicros != null
                ? formatCurrencyFromMicros(row.previousDailyBudgetMicros)
                : "—"}{" "}
              →{" "}
              {row.newDailyBudgetMicros != null
                ? formatCurrencyFromMicros(row.newDailyBudgetMicros)
                : "—"}
            </p>
            <p className="mt-0.5 text-xs font-light leading-relaxed text-neutral-500">
              {row.decisionReason ?? "Budget adjustment"}
              {row.optimizationGoal
                ? ` · ${optimizationGoalLabel(row.optimizationGoal)}`
                : ""}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs font-light whitespace-nowrap text-neutral-400">
            <p>{formatAdjustmentDate(row.createdAt)}</p>
            {row.changePct != null ? (
              <p className="tabular-nums">
                {row.changePct >= 0 ? "+" : ""}
                {row.changePct.toFixed(1)}%
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

type EntityAutomationSectionProps = {
  entityId: string;
  entityLabel: string;
  detail: EntityDetailResult;
  onAutomationUpdated: (automation: EntityDetailResult["automation"]) => void;
};

function resolveInitialProfileId(detail: EntityDetailResult): string | null {
  if (detail.automation.profileId) return detail.automation.profileId;
  return (
    detail.profiles.find((profile) => profile.isDefault)?.id ??
    detail.profiles[0]?.id ??
    null
  );
}

export function EntityAutomationSection({
  entityId,
  entityLabel,
  detail,
  onAutomationUpdated,
}: EntityAutomationSectionProps) {
  const [adjustments, setAdjustments] = React.useState(detail.recentAdjustments);
  const [enabled, setEnabled] = React.useState(detail.automation.enabled);
  const [profileId, setProfileId] = React.useState<string | null>(() =>
    resolveInitialProfileId(detail),
  );
  const [minBudget, setMinBudget] = React.useState(
    microsToDollars(detail.automation.minDailyBudgetMicros),
  );
  const [maxBudget, setMaxBudget] = React.useState(
    microsToDollars(detail.automation.maxDailyBudgetMicros),
  );
  const [settings, setSettings] = React.useState<SpendAutomationSettings>(
    detail.automation.effectiveSettings,
  );
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setAdjustments(detail.recentAdjustments);
    setEnabled(detail.automation.enabled);
    setProfileId(resolveInitialProfileId(detail));
    setMinBudget(microsToDollars(detail.automation.minDailyBudgetMicros));
    setMaxBudget(microsToDollars(detail.automation.maxDailyBudgetMicros));
    setSettings(detail.automation.effectiveSettings);
  }, [detail]);

  const selectedProfile = detail.profiles.find((profile) => profile.id === profileId);
  const optimizationGoal: OptimizationGoal =
    selectedProfile?.optimizationGoal ?? "roas";

  const updateSetting = <K extends keyof SpendAutomationSettings>(
    key: K,
    value: SpendAutomationSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const baseSettings =
      detail.profiles.find((profile) => profile.id === profileId)?.settings ??
      detail.automation.effectiveSettings;

    const settingsOverride = Object.fromEntries(
      (Object.keys(settings) as Array<keyof SpendAutomationSettings>)
        .filter(
          (key) =>
            key !== "cooldownHours" && settings[key] !== baseSettings[key],
        )
        .map((key) => [key, settings[key]]),
    ) as Partial<SpendAutomationSettings>;

    const response = await fetch(`/api/campaigns/${entityId}/automation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        profileId,
        cooldownHours: settings.cooldownHours,
        minDailyBudgetMicros: dollarsToMicros(minBudget),
        maxDailyBudgetMicros: dollarsToMicros(maxBudget),
        settingsOverride,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Failed to save automation settings.");
      return;
    }

    const payload = (await response.json()) as {
      automation: EntityDetailResult["automation"];
    };
    onAutomationUpdated(payload.automation);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  if (!detail.canAutomate) return null;

  return (
    <div className="space-y-12">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <DetailSection title="AdPilot budget control">
        <div className="space-y-10">
          {detail.automation.enabled ? (
            <p className="text-xs font-light text-neutral-500">
              Status:{" "}
              <span className="font-medium text-neutral-700">
                {automationStatusLabel(detail.automation.automationStatus)}
              </span>
              {detail.automation.lastAdjustedAt
                ? ` · Last adjusted ${formatAdjustmentDate(detail.automation.lastAdjustedAt)}`
                : ""}
            </p>
          ) : (
            <p className="text-xs font-light text-neutral-500">
              AdPilot is off for this {entityLabel}. Turn it on with the AdPilot
              toggle at the top of the page to let the worker adjust the daily
              budget within the guardrails below.
            </p>
          )}

          <div>
            <DetailSubLabel>Automation preset</DetailSubLabel>
            <p className="mt-1 text-xs font-light text-neutral-500">
              Pick a workspace preset to inherit defaults. Per-{entityLabel} overrides
              are stored on this {entityLabel} only.
            </p>
            {detail.profiles.length === 0 ? (
              <p className="mt-4 text-sm font-light text-neutral-500">
                No presets yet.{" "}
                <Link href="/settings" className="text-[var(--walls-sky)] hover:underline">
                  Create one in Settings
                </Link>{" "}
                — or save here to use built-in defaults for this {entityLabel}.
              </p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {detail.profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setProfileId(profile.id);
                      setSettings(profile.settings);
                      setSaved(false);
                    }}
                    className={detailSelectableClass(
                      profileId === profile.id,
                      "px-4 py-3 text-left",
                    )}
                  >
                    {profileId === profile.id ? (
                      <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#3f4a0e] text-walls-yellow ring-1 ring-[#2c3406]/20">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : null}
                    <p
                      className={cn(
                        "text-sm",
                        profileId === profile.id
                          ? "pr-6 font-semibold text-walls-forest"
                          : "font-medium text-foreground",
                      )}
                    >
                      {profile.name}
                      {profile.isDefault ? (
                        <span className="ml-2 text-[10px] font-light uppercase tracking-wider text-neutral-400">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-light",
                        profileId === profile.id
                          ? "text-walls-forest/80"
                          : "text-neutral-500",
                      )}
                    >
                      Optimize for {optimizationGoalLabel(profile.optimizationGoal)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <DetailSubLabel>Budget bounds</DetailSubLabel>
            <p className="mt-1 text-xs font-light text-neutral-500">
              Hard min/max daily budget (USD) the algorithm may not exceed.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Minimum daily budget
                </span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="No minimum"
                  value={minBudget}
                  onChange={(e) => {
                    setMinBudget(e.target.value);
                    setSaved(false);
                  }}
                  className="rounded-full border-neutral-200 bg-walls-white font-light"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Maximum daily budget
                </span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="No maximum"
                  value={maxBudget}
                  onChange={(e) => {
                    setMaxBudget(e.target.value);
                    setSaved(false);
                  }}
                  className="rounded-full border-neutral-200 bg-walls-white font-light"
                />
              </label>
            </div>
            {optimizationGoal === "roas" || optimizationGoal === "conversions" ? (
              <div className="mt-5 border-t border-neutral-100 pt-5">
                <RoasFloorField
                  variant="detail"
                  settings={settings}
                  onChange={(patch) => {
                    setSettings((prev) => ({ ...prev, ...patch }));
                    setSaved(false);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div>
            <DetailSubLabel>Entity overrides</DetailSubLabel>
            <p className="mt-1 text-xs font-light text-neutral-500">
              Tuning for{" "}
              {OPTIMIZATION_GOAL_OPTIONS.find(
                (option) => option.value === optimizationGoal,
              )?.hint.toLowerCase()}
              . Only changes from the preset are stored on this entity.
            </p>

            <div className="mt-6 space-y-8">
              <SliderField
                label="Spend aggressiveness"
                hint="How quickly AdPilot ramps budget on strong performers"
                value={settings.aggressiveness}
                min={0}
                max={100}
                step={1}
                onChange={(value) => updateSetting("aggressiveness", value)}
                endLabels={{
                  left: "Conservative",
                  center: "Balanced",
                  right: "Aggressive",
                }}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <SliderField
                  label="Max daily increase"
                  value={settings.maxDailyIncreasePct}
                  min={5}
                  max={50}
                  step={1}
                  suffix="%"
                  onChange={(value) => updateSetting("maxDailyIncreasePct", value)}
                  endLabels={{ left: "5%", right: "50%" }}
                />
                <SliderField
                  label="Max daily decrease"
                  value={settings.maxDailyDecreasePct}
                  min={5}
                  max={50}
                  step={1}
                  suffix="%"
                  onChange={(value) => updateSetting("maxDailyDecreasePct", value)}
                  endLabels={{ left: "5%", right: "50%" }}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">
                  Cooldown between budget changes
                </p>
                <p className="mt-1 text-xs font-light text-neutral-500">
                  Minimum wait before AdPilot can increase or decrease the daily
                  budget again on this {entityLabel}.
                </p>
                <div className={cn("mt-3", segmentTrackClass)}>
                  {COOLDOWN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateSetting("cooldownHours", option.value)}
                      className={cn(
                        toggleChipBaseClass,
                        settings.cooldownHours === option.value
                          ? toggleChipActiveClass
                          : toggleChipInactiveClass,
                      )}
                    >
                      {settings.cooldownHours === option.value ? (
                        <SegmentThumb layoutId="entity-cooldown-thumb" />
                      ) : null}
                      <span className="relative z-10">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {optimizationGoal === "ctr" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    CTR floor (%)
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={settings.ctrFloorPct ?? ""}
                    onChange={(e) =>
                      updateSetting(
                        "ctrFloorPct",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="rounded-full border-neutral-200 bg-walls-white font-light"
                  />
                </label>
              ) : null}

              {optimizationGoal === "cpa" || optimizationGoal === "conversions" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    CPA ceiling (USD)
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={settings.cpaCeiling ?? ""}
                    onChange={(e) =>
                      updateSetting(
                        "cpaCeiling",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="rounded-full border-neutral-200 bg-walls-white font-light"
                  />
                </label>
              ) : null}

              <div className="space-y-5 border-t border-neutral-200/70 pt-6">
                <LabeledSwitch
                  size="lg"
                  checked={settings.learningPhaseProtection}
                  onCheckedChange={(value) =>
                    updateSetting("learningPhaseProtection", value)
                  }
                  label="Learning phase protection"
                  description="Block scale-ups while Meta marks the ad set as learning limited."
                />
                <LabeledSwitch
                  size="lg"
                  checked={settings.pauseOnFatigue}
                  onCheckedChange={(value) => updateSetting("pauseOnFatigue", value)}
                  label="Pause on frequency fatigue"
                  description="Slow scaling when frequency rises and CTR drops week over week."
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-light text-neutral-500">
              <Shield className="h-3.5 w-3.5" />
              Saves to this {entityLabel}&apos;s enrollment record. Budget changes
              from preview apply directly to Meta.
            </p>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className={cn(primaryButtonClass, "inline-flex items-center gap-2")}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                "Settings saved"
              ) : (
                "Save AdPilot settings"
              )}
            </Button>
          </div>
        </div>
      </DetailSection>

      <AdPilotPreviewCard
        entityId={entityId}
        entityLabel={entityLabel}
        onApplied={(adjustment) =>
          setAdjustments((current) => [adjustment, ...current].slice(0, 10))
        }
      />

      <AgentInstructionsSection
        entityId={entityId}
        entityLabel={entityLabel}
        initialInstructions={detail.agentInstructions}
      />

      <DetailSection
        title="Budget history"
        description="Recent daily budget adjustments for this entity."
      >
        <AdjustmentsList rows={adjustments} />
      </DetailSection>
    </div>
  );
}

type InstructionFormState = {
  instructions: string;
  startsAt: string;
  endsAt: string;
};

const EMPTY_INSTRUCTION_FORM: InstructionFormState = {
  instructions: "",
  startsAt: "",
  endsAt: "",
};

function instructionStatusMeta(status: AgentInstructionStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-emerald-50 text-emerald-700",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        className: "bg-sky-50 text-sky-700",
      };
    case "expired":
      return {
        label: "Expired",
        className: "bg-neutral-100 text-neutral-500",
      };
    case "disabled":
    default:
      return {
        label: "Off",
        className: "bg-neutral-100 text-neutral-500",
      };
  }
}

function instructionWindowLabel(instruction: AgentInstruction): string {
  const { startsAt, endsAt } = instruction;
  if (startsAt && endsAt) {
    return `${formatAdjustmentDate(startsAt)} → ${formatAdjustmentDate(endsAt)}`;
  }
  if (startsAt) return `From ${formatAdjustmentDate(startsAt)}`;
  if (endsAt) return `Until ${formatAdjustmentDate(endsAt)}`;
  return "Always on (no schedule)";
}

function AgentInstructionsSection({
  entityId,
  entityLabel,
  initialInstructions,
}: {
  entityId: string;
  entityLabel: string;
  initialInstructions: AgentInstruction[];
}) {
  const [items, setItems] = React.useState(initialInstructions);

  React.useEffect(() => {
    setItems(initialInstructions);
  }, [initialInstructions]);

  const activeCount = items.filter(
    (item) =>
      resolveInstructionStatus({
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        isActive: item.isActive,
      }) === "active",
  ).length;

  return (
    <DetailSection
      title="Agent instructions"
      description="Natural-language guidance the AdPilot agent reads when deciding how to move spend. Add as many as you like, each with its own schedule."
      defaultOpen={false}
      collapsedBadgeCount={activeCount}
    >
      <AgentInstructionsManager
        entityId={entityId}
        entityLabel={entityLabel}
        items={items}
        onItemsChange={setItems}
      />
    </DetailSection>
  );
}

function AgentInstructionsManager({
  entityId,
  entityLabel,
  items,
  onItemsChange,
}: {
  entityId: string;
  entityLabel: string;
  items: AgentInstruction[];
  onItemsChange: React.Dispatch<React.SetStateAction<AgentInstruction[]>>;
}) {
  const [form, setForm] = React.useState<InstructionFormState>(
    EMPTY_INSTRUCTION_FORM,
  );
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setItems = onItemsChange;

  const resetForm = () => {
    setForm(EMPTY_INSTRUCTION_FORM);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const startCreate = () => {
    setForm(EMPTY_INSTRUCTION_FORM);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (instruction: AgentInstruction) => {
    setForm({
      instructions: instruction.instructions,
      startsAt: isoToDatetimeLocalValue(instruction.startsAt),
      endsAt: isoToDatetimeLocalValue(instruction.endsAt),
    });
    setEditingId(instruction.id);
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.instructions.trim()) {
      setError("Add some instructions first.");
      return;
    }
    setBusy(true);
    setError(null);

    const body = {
      instructions: form.instructions.trim(),
      startsAt: datetimeLocalValueToIso(form.startsAt),
      endsAt: datetimeLocalValueToIso(form.endsAt),
    };
    const url = editingId
      ? `/api/campaigns/${entityId}/instructions/${editingId}`
      : `/api/campaigns/${entityId}/instructions`;

    const response = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setBusy(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Failed to save instruction.");
      return;
    }

    const payload = (await response.json()) as { instruction: AgentInstruction };
    setItems((current) =>
      editingId
        ? current.map((item) =>
            item.id === editingId ? payload.instruction : item,
          )
        : [payload.instruction, ...current],
    );
    resetForm();
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);

    const response = await fetch(
      `/api/campaigns/${entityId}/instructions/${id}`,
      { method: "DELETE" },
    );

    setBusy(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Failed to delete instruction.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  };

  const handleToggleActive = async (instruction: AgentInstruction) => {
    setBusy(true);
    setError(null);

    const response = await fetch(
      `/api/campaigns/${entityId}/instructions/${instruction.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !instruction.isActive }),
      },
    );

    setBusy(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Failed to update instruction.");
      return;
    }

    const payload = (await response.json()) as { instruction: AgentInstruction };
    setItems((current) =>
      current.map((item) =>
        item.id === instruction.id ? payload.instruction : item,
      ),
    );
  };

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {items.length === 0 && !showForm ? (
        <p className="text-sm font-light text-neutral-500">
          No instructions yet. The agent runs on preset guardrails until you add
          guidance for this {entityLabel}.
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((instruction) => {
            const meta = instructionStatusMeta(instruction.status);
            return (
              <div
                key={instruction.id}
                className={cn(
                  "rounded-2xl border px-4 py-3.5",
                  instruction.status === "active"
                    ? "border-emerald-100 bg-emerald-50/30"
                    : "border-neutral-200 bg-walls-white",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        meta.className,
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs font-light text-neutral-500">
                      {instructionWindowLabel(instruction)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggleActive(instruction)}
                      className={cn(
                        secondaryButtonClass,
                        "px-3 py-1 text-[11px] disabled:opacity-50",
                      )}
                    >
                      {instruction.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startEdit(instruction)}
                      aria-label="Edit instruction"
                      className={cn(
                        secondaryButtonClass,
                        "p-1.5 disabled:opacity-50",
                      )}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(instruction.id)}
                      aria-label="Delete instruction"
                      className={cn(
                        secondaryButtonClass,
                        "p-1.5 text-rose-600 disabled:opacity-50",
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-sm font-light leading-relaxed text-neutral-700">
                  {instruction.instructions}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {showForm ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-walls-white px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-800">
              {editingId ? "Edit instruction" : "New instruction"}
            </p>
            <button
              type="button"
              onClick={resetForm}
              aria-label="Cancel"
              className={cn(secondaryButtonClass, "p-1.5")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Textarea
            value={form.instructions}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, instructions: e.target.value }))
            }
            placeholder="e.g. Scale daily budget as aggressively as allowed until we hit the ROAS floor."
            rows={3}
            className="rounded-xl border border-neutral-200 bg-walls-white px-3 py-2.5 font-light text-sm"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Start
              </span>
              <p className="text-xs font-light text-neutral-500">
                Leave blank to start now. Set a future time to schedule ahead.
              </p>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                }
                className="rounded-full border-neutral-200 bg-walls-white font-light"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">End</span>
              <p className="text-xs font-light text-neutral-500">
                Leave blank for no expiry.
              </p>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                }
                className="rounded-full border-neutral-200 bg-walls-white font-light"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              onClick={resetForm}
              className={cn(secondaryButtonClass, "px-4")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleSubmit()}
              className={cn(primaryButtonClass, "inline-flex items-center gap-2")}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : editingId ? (
                "Save changes"
              ) : (
                "Add instruction"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={startCreate}
          className={cn(secondaryButtonClass, "inline-flex items-center gap-2")}
        >
          <Plus className="h-4 w-4" />
          Add instruction
        </Button>
      )}
    </div>
  );
}
