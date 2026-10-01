import { NextResponse } from "next/server";

import { authenticateEventKey } from "@/lib/api-key-auth";
import { upsertWorkflowAudienceFromEvent } from "./workflow-audience";

type EventBody = {
  event?: string;
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
  external_id?: string;
  occurred_at?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const auth = await authenticateEventKey(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as EventBody;
  const eventKey = body.event?.trim().toLowerCase();
  if (!eventKey || !/^[a-z][a-z0-9_]*$/.test(eventKey)) {
    return NextResponse.json(
      { error: "event must be a lowercase event key using letters, numbers, and underscores" },
      { status: 400 },
    );
  }
  if (!isObject(body.payload)) {
    return NextResponse.json({ error: "payload must be an object" }, { status: 400 });
  }
  if (body.context !== undefined && !isObject(body.context)) {
    return NextResponse.json({ error: "context must be an object" }, { status: 400 });
  }

  const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "occurred_at must be a valid ISO timestamp" }, { status: 400 });
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || null;
  if (idempotencyKey && idempotencyKey.length > 255) {
    return NextResponse.json({ error: "Idempotency-Key must be 255 characters or fewer" }, { status: 400 });
  }

  const { data: definition, error: definitionError } = await auth.admin
    .from("workflow_events")
    .select("id, key, is_active")
    .eq("account_id", auth.accountId)
    .eq("key", eventKey)
    .maybeSingle();

  if (definitionError) {
    console.error("[api] event definition lookup failed", definitionError);
    return NextResponse.json({ error: "Unable to accept event" }, { status: 500 });
  }
  if (!definition || !definition.is_active) {
    return NextResponse.json({ error: "Unknown or inactive event" }, { status: 404 });
  }

  const { data: occurrence, error } = await auth.admin
    .from("workflow_event_occurrences")
    .insert({
      account_id: auth.accountId,
      event_id: definition.id,
      event_key: definition.key,
      api_key_id: auth.keyId,
      external_id: body.external_id?.trim() || null,
      idempotency_key: idempotencyKey,
      payload: body.payload,
      context: body.context ?? {},
      occurred_at: occurredAt.toISOString(),
    })
    .select("id, event_key, occurred_at, received_at, created_at")
    .single();

  if (error?.code === "23505" && idempotencyKey) {
    const { data: existing } = await auth.admin
      .from("workflow_event_occurrences")
      .select("id, event_key, external_id, payload, context, occurred_at, received_at, created_at")
      .eq("account_id", auth.accountId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      try {
        await upsertWorkflowAudienceFromEvent({
          admin: auth.admin,
          accountId: auth.accountId,
          occurrenceId: existing.id,
          payload: (existing.payload as Record<string, unknown>) ?? {},
          context: (existing.context as Record<string, unknown>) ?? {},
          externalId: existing.external_id,
          occurredAt: existing.occurred_at,
        });
      } catch (audienceError) {
        console.error("[api] flow audience retry upsert failed", audienceError);
      }
    }

    return NextResponse.json({ accepted: true, deduplicated: true, event: existing }, { status: 200 });
  }
  if (error || !occurrence) {
    console.error("[api] event occurrence insert failed", error);
    return NextResponse.json({ error: "Unable to accept event" }, { status: 500 });
  }

  try {
    await upsertWorkflowAudienceFromEvent({
      admin: auth.admin,
      accountId: auth.accountId,
      occurrenceId: occurrence.id,
      payload: body.payload,
      context: body.context ?? {},
      externalId: body.external_id?.trim() || null,
      occurredAt: occurredAt.toISOString(),
    });
  } catch (audienceError) {
    console.error("[api] flow audience upsert failed", audienceError);
  }

  return NextResponse.json({ accepted: true, deduplicated: false, event: occurrence }, { status: 202 });
}
