import { NextResponse } from "next/server";

import { withMeteredEnqueue } from "@/lib/metered-route";
import {
  PEOPLE_ENRICHMENT_JOB_TYPE,
  PEOPLE_ENRICHMENT_SLUG,
  parsePeopleEnrichmentInput,
  type PeopleEnrichmentBody,
} from "@/lib/people-enrichment";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PeopleEnrichmentBody;
  const parsed = parsePeopleEnrichmentInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  return withMeteredEnqueue(request, PEOPLE_ENRICHMENT_SLUG, async (ctx) => {
    const { data, error } = await ctx.admin
      .from("systems_jobs")
      .insert({
        type: PEOPLE_ENRICHMENT_JOB_TYPE,
        status: "pending",
        account_id: ctx.key.accountId,
        api_key_id: ctx.key.id,
        product_id: ctx.product.id,
        request_id: ctx.requestId,
        input: parsed.input,
      })
      .select("id, status, created_at")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to enqueue people enrichment");
    }

    return {
      job_id: data.id,
      status: data.status,
      created_at: data.created_at,
      poll_url: `/api/v1/people-enrichment/jobs/${data.id}`,
    };
  });
}
