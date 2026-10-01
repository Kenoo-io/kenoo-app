import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

const WORKFLOWS_ACCOUNT_COOKIE = "workflows_account_id";
const RANGE_DAYS = 30;

async function getAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, accountId: null };

  const cookieStore = await cookies();
  const accountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(WORKFLOWS_ACCOUNT_COOKIE)?.value ?? null;
  if (!accountId) return { supabase, accountId: null };

  const { data: membership } = await supabase
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .maybeSingle();

  return { supabase, accountId: membership?.account_id ?? null };
}

type Occurrence = {
  event_id: string;
  event_key: string;
  occurred_at: string;
  external_id: string | null;
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const { supabase, accountId } = await getAccountContext();
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });

  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeStart.getDate() - (RANGE_DAYS - 1));
  rangeStart.setHours(0, 0, 0, 0);

  const [{ data: definitions, error: definitionsError }, { data: presets, error: presetsError }, { data: occurrences, error: occurrencesError }] = await Promise.all([
    supabase
      .from("workflow_events")
      .select("id, key, name, is_active")
      .eq("account_id", accountId),
    supabase
      .from("workflow_event_presets")
      .select("key, category")
      .eq("is_active", true),
    supabase
      .from("workflow_event_occurrences")
      .select("event_id, event_key, occurred_at, external_id")
      .eq("account_id", accountId)
      .gte("occurred_at", rangeStart.toISOString())
      .lte("occurred_at", rangeEnd.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(10000),
  ]);

  if (definitionsError || presetsError || occurrencesError) {
    console.error("[workflows] analytics load failed", definitionsError ?? presetsError ?? occurrencesError);
    return NextResponse.json({ error: "Unable to load analytics" }, { status: 500 });
  }

  const eventDefinitions = (definitions ?? []) as { id: string; key: string; name: string; is_active: boolean }[];
  const presetCategories = new Map((presets ?? []).map((preset) => [preset.key as string, preset.category as string]));
  const eventOccurrences = (occurrences ?? []) as Occurrence[];
  const namesByKey = new Map(eventDefinitions.map((event) => [event.key, event.name]));
  const dailyCounts = new Map<string, number>();
  const eventCounts = new Map<string, { count: number; lastOccurredAt: string }>();

  for (let index = 0; index < RANGE_DAYS; index += 1) {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + index);
    dailyCounts.set(dayKey(date), 0);
  }

  for (const occurrence of eventOccurrences) {
    const date = dayKey(new Date(occurrence.occurred_at));
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
    const current = eventCounts.get(occurrence.event_key);
    eventCounts.set(occurrence.event_key, {
      count: (current?.count ?? 0) + 1,
      lastOccurredAt: current?.lastOccurredAt ?? occurrence.occurred_at,
    });
  }

  const totalOccurrences = eventOccurrences.length;
  const todayKey = dayKey(new Date());
  const activeEventTypes = eventCounts.size;
  const uniqueProfiles = new Set(eventOccurrences.map((occurrence) => occurrence.external_id).filter(Boolean)).size;
  const daily = [...dailyCounts].map(([date, count]) => ({ date, count }));
  const breakdown = [...eventCounts]
    .map(([key, value]) => ({
      key,
      name: namesByKey.get(key) ?? key,
      category: presetCategories.get(key) ?? "custom",
      count: value.count,
      share: totalOccurrences ? Math.round((value.count / totalOccurrences) * 100) : 0,
      lastOccurredAt: value.lastOccurredAt,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    range: { start: rangeStart.toISOString(), end: rangeEnd.toISOString(), days: RANGE_DAYS },
    summary: {
      totalOccurrences,
      activeEventTypes,
      occurrencesToday: dailyCounts.get(todayKey) ?? 0,
      uniqueProfiles,
      configuredEventTypes: eventDefinitions.length,
    },
    daily,
    breakdown,
    latestOccurrence: eventOccurrences[0] ?? null,
  });
}
