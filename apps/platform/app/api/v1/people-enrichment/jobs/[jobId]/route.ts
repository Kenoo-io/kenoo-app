import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/metered-route";
import { PEOPLE_ENRICHMENT_JOB_TYPE } from "@/lib/people-enrichment";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return auth.error;

  const { jobId } = await context.params;
  if (!jobId?.trim()) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("systems_jobs")
    .select("id, status, input, result, error, created_at, started_at, completed_at")
    .eq("id", jobId)
    .eq("account_id", auth.key.accountId)
    .eq("type", PEOPLE_ENRICHMENT_JOB_TYPE)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    job_id: data.id,
    status: data.status,
    input: data.input,
    result: data.result,
    error: data.error,
    created_at: data.created_at,
    started_at: data.started_at,
    completed_at: data.completed_at,
  });
}
