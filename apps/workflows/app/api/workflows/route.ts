import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

const WORKFLOWS_ACCOUNT_COOKIE = "workflows_account_id";

async function getAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, accountId: null };

  const cookieStore = await cookies();
  const accountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(WORKFLOWS_ACCOUNT_COOKIE)?.value ?? null;
  if (!accountId) return { supabase, userId: user.id, accountId: null };

  const { data: membership } = await supabase
    .from("account_users")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .maybeSingle();

  return { supabase, userId: user.id, accountId: membership?.account_id ?? null };
}

type WorkflowDefinition = {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
};

function isWorkflowDefinition(value: unknown): value is WorkflowDefinition {
  if (!value || typeof value !== "object") return false;
  const definition = value as { nodes?: unknown; edges?: unknown };
  return Array.isArray(definition.nodes) && Array.isArray(definition.edges);
}

async function createWorkflowVersion({
  supabase,
  workflowId,
  accountId,
  userId,
  triggerEventId,
  definition,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  workflowId: string;
  accountId: string;
  userId: string;
  triggerEventId: string | null;
  definition: WorkflowDefinition;
}) {
  const { data: latestVersion, error: latestVersionError } = await supabase
    .from("workflow_workflow_versions")
    .select("version_number")
    .eq("workflow_id", workflowId)
    .eq("account_id", accountId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestVersionError) return { data: null, error: latestVersionError };

  return supabase
    .from("workflow_workflow_versions")
    .insert({
      account_id: accountId,
      workflow_id: workflowId,
      version_number: (latestVersion?.version_number ?? 0) + 1,
      status: "draft",
      definition,
      trigger_event_id: triggerEventId,
      created_by: userId,
    })
    .select("id, workflow_id, version_number, status, definition, trigger_event_id, created_at, updated_at")
    .single();
}

export async function POST(request: Request) {
  const { supabase, userId, accountId } = await getAccountContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string | null;
    triggerEventId?: string | null;
    definition?: unknown;
  };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Workflow name is required" }, { status: 400 });
  if (!isWorkflowDefinition(body.definition)) return NextResponse.json({ error: "A valid workflow definition is required" }, { status: 400 });

  const { data: workflow, error: workflowError } = await supabase
    .from("workflow_workflows")
    .insert({
      account_id: accountId,
      name,
      description: body.description?.trim() || null,
      status: "draft",
      created_by: userId,
    })
    .select("id, account_id, name, description, status, active_version_id, created_at, updated_at")
    .single();

  if (workflowError || !workflow) {
    console.error("[workflows] workflow creation failed", { accountId, workflowError });
    return NextResponse.json({ error: "Unable to save workflow" }, { status: 500 });
  }

  const { data: version, error: versionError } = await createWorkflowVersion({
    supabase,
    workflowId: workflow.id,
    accountId,
    userId,
    triggerEventId: body.triggerEventId ?? null,
    definition: body.definition,
  });

  if (versionError || !version) {
    await supabase.from("workflow_workflows").delete().eq("id", workflow.id).eq("account_id", accountId);
    console.error("[workflows] workflow version creation failed", { accountId, workflowId: workflow.id, versionError });
    return NextResponse.json({ error: "Unable to save workflow version" }, { status: 500 });
  }

  return NextResponse.json({ workflow, version }, { status: 201 });
}
