import type { SupabaseClient } from "@supabase/supabase-js";

type AudiencePayload = Record<string, unknown>;

const STANDARD_KEYS = new Set([
  "email", "first_name", "firstName", "last_name", "lastName", "full_name", "fullName", "name",
  "phone", "company", "company_name", "job_title", "jobTitle", "title", "source", "external_id",
  "externalId", "customer_id", "customerId", "user_id", "userId", "contact_id", "contactId",
]);

function firstString(payload: AudiencePayload, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function normalizeEmail(email: string | null): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized && normalized.includes("@") ? normalized : null;
}

function customPayload(payload: AudiencePayload): AudiencePayload {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !STANDARD_KEYS.has(key)));
}

async function attachOccurrenceToAudience(admin: SupabaseClient, accountId: string, occurrenceId: string, audienceId: string) {
  const { error } = await admin
    .from("flow_event_occurrences")
    .update({ audience_id: audienceId })
    .eq("id", occurrenceId)
    .eq("account_id", accountId);
  if (error) throw error;
}

export async function upsertFlowAudienceFromEvent({
  admin,
  accountId,
  occurrenceId,
  payload,
  context,
  externalId,
  occurredAt,
}: {
  admin: SupabaseClient;
  accountId: string;
  occurrenceId: string;
  payload: AudiencePayload;
  context: AudiencePayload;
  externalId: string | null;
  occurredAt: string;
}): Promise<{ id: string | null; created: boolean; skipped: boolean }> {
  const email = normalizeEmail(firstString(payload, ["email"]));
  const explicitExternalId = externalId || firstString(payload, ["external_id", "externalId", "customer_id", "customerId", "user_id", "userId", "contact_id", "contactId"]);
  const source = firstString(context, ["source", "integration", "app"]) || firstString(payload, ["source"]) || "api";

  // Do not create anonymous audience rows for events that cannot identify a person.
  if (!email && !explicitExternalId) return { id: null, created: false, skipped: true };

  const audienceKey = email ? `email:${email}` : `external:${source}:${explicitExternalId}`;
  const { data: occurrence } = await admin
    .from("flow_event_occurrences")
    .select("audience_id")
    .eq("id", occurrenceId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (occurrence?.audience_id) return { id: occurrence.audience_id, created: false, skipped: false };

  const { data: byEmail } = email
    ? await admin.from("flow_audience").select("id, audience_key, email_normalized, event_count, first_seen_at, custom_payload, last_event_id").eq("account_id", accountId).eq("email_normalized", email).maybeSingle()
    : { data: null };
  const { data: existingByKey } = byEmail
    ? { data: null }
    : await admin.from("flow_audience").select("id, audience_key, email_normalized, event_count, first_seen_at, custom_payload, last_event_id").eq("account_id", accountId).eq("audience_key", audienceKey).maybeSingle();

  const existing = byEmail ?? existingByKey;
  if (existing?.last_event_id === occurrenceId) {
    await attachOccurrenceToAudience(admin, accountId, occurrenceId, existing.id);
    return { id: existing.id, created: false, skipped: false };
  }
  const firstName = firstString(payload, ["first_name", "firstName"]);
  const lastName = firstString(payload, ["last_name", "lastName"]);
  const fullName = firstString(payload, ["full_name", "fullName", "name"]) || [firstName, lastName].filter(Boolean).join(" ") || null;
  const standardFields = {
    source,
    external_id: explicitExternalId,
    email: email,
    email_normalized: email,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    phone: firstString(payload, ["phone"]),
    company: firstString(payload, ["company", "company_name"]),
    job_title: firstString(payload, ["job_title", "jobTitle", "title"]),
    custom_payload: customPayload(payload),
    last_seen_at: occurredAt,
    last_event_id: occurrenceId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const mergedCustomPayload = {
      ...((existing.custom_payload as AudiencePayload | null) ?? {}),
      ...standardFields.custom_payload,
    };
    const nextFields = Object.fromEntries(Object.entries({ ...standardFields, custom_payload: mergedCustomPayload }).filter(([, value]) => value !== null && value !== ""));
    const { data, error } = await admin.from("flow_audience").update({
      ...nextFields,
      audience_key: existing.audience_key,
      event_count: (existing.event_count ?? 0) + 1,
    }).eq("id", existing.id).select("id").single();
    if (error) throw error;
    await attachOccurrenceToAudience(admin, accountId, occurrenceId, data.id);
    return { id: data.id, created: false, skipped: false };
  }

  const { data, error } = await admin.from("flow_audience").insert({
    account_id: accountId,
    audience_key: audienceKey,
    ...standardFields,
    first_seen_at: occurredAt,
    first_event_id: occurrenceId,
  }).select("id").single();
  if (error) throw error;
  await attachOccurrenceToAudience(admin, accountId, occurrenceId, data.id);
  return { id: data.id, created: true, skipped: false };
}
