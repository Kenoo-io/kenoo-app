import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

const WORKFLOWS_ACCOUNT_COOKIE = "workflows_account_id";

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

type AudienceRow = {
  id: string;
  audience_key: string;
  source: string | null;
  external_id: string | null;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  first_seen_at: string;
  last_seen_at: string;
  event_count: number;
  first_event_id: string | null;
  last_event_id: string | null;
};

export async function GET() {
  const { supabase, accountId } = await getAccountContext();
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });

  const { data, error, count } = await supabase
    .from("workflow_audience")
    .select("id, audience_key, source, external_id, email, full_name, first_name, last_name, phone, company, job_title, first_seen_at, last_seen_at, event_count, first_event_id, last_event_id", { count: "exact" })
    .eq("account_id", accountId)
    .order("last_seen_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[workflows] audience load failed", { accountId, error });
    return NextResponse.json({ error: "Unable to load audience" }, { status: 500 });
  }

  const profiles = (data ?? []) as AudienceRow[];
  const lastEventIds = [...new Set(profiles.map((profile) => profile.last_event_id).filter((id): id is string => Boolean(id)))];
  const [{ data: occurrences, error: occurrenceError }, { data: eventDefinitions, error: eventError }] = await Promise.all([
    lastEventIds.length
      ? supabase.from("workflow_event_occurrences").select("id, event_id, event_key, occurred_at").in("id", lastEventIds).eq("account_id", accountId)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("workflow_events").select("id, key, name").eq("account_id", accountId),
  ]);

  if (occurrenceError) console.error("[workflows] audience recent events load failed", { accountId, occurrenceError });
  if (eventError) console.error("[workflows] audience event definitions load failed", { accountId, eventError });

  const occurrencesById = new Map((occurrences ?? []).map((occurrence) => [occurrence.id, occurrence]));
  const eventNamesById = new Map((eventDefinitions ?? []).map((event) => [event.id, event.name]));
  const enrichedProfiles = profiles.map((profile) => {
    const occurrence = profile.last_event_id ? occurrencesById.get(profile.last_event_id) : null;
    return {
      ...profile,
      last_event: occurrence
        ? { key: occurrence.event_key, name: eventNamesById.get(occurrence.event_id) ?? occurrence.event_key, occurred_at: occurrence.occurred_at }
        : null,
    };
  });

  const totalEvents = profiles.reduce((total, profile) => total + (profile.event_count ?? 0), 0);
  const knownEmails = profiles.filter((profile) => Boolean(profile.email)).length;
  const recentlyActive = profiles.filter((profile) => Date.now() - new Date(profile.last_seen_at).getTime() <= 7 * 24 * 60 * 60 * 1000).length;

  return NextResponse.json({
    profiles: enrichedProfiles,
    summary: {
      totalProfiles: count ?? profiles.length,
      knownEmails,
      totalEvents,
      recentlyActive,
    },
  });
}
