import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_ACCOUNT_COOKIE } from "@walls/auth/active-account";
import { createClient } from "@walls/supabase/server";

const FLOWS_ACCOUNT_COOKIE = "flows_account_id";

async function getAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, accountId: null };

  const cookieStore = await cookies();
  const accountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value ?? cookieStore.get(FLOWS_ACCOUNT_COOKIE)?.value ?? null;
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

export async function PATCH(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const { supabase, userId, accountId } = await getAccountContext();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accountId) return NextResponse.json({ error: "No active account" }, { status: 401 });

  const { workflowId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string | null;
    triggerEventId?: string | null;
    definition?: unknown;
  };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Flow name is required" }, { status: 400 });
  if (!isWorkflowDefinition(body.definition)) return NextResponse.json({ error: "A valid flow definition is required" }, { status: 400 });

  const { data: workflow, error: workflowError } = await supabase
    .from("flow_workflows")
    .update({ name, description: body.description?.trim() || null })
    .eq("id", workflowId)
    .eq("account_id", accountId)
    .select("id, account_id, name, description, status, active_version_id, created_at, updated_at")
    .maybeSingle();

  if (workflowError) {
    console.error("[flows] workflow update failed", { accountId, workflowId, workflowError });
    return NextResponse.json({ error: "Unable to update flow" }, { status: 500 });
  }
  if (!workflow) return NextResponse.json({ error: "Flow not found" }, { status: 404 });

  const { data: version, error: versionError } = await supabase
    .from("flow_workflow_versions")
    .select("version_number")
    .eq("workflow_id", workflowId)
    .eq("account_id", accountId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError) return NextResponse.json({ error: "Unable to load flow version" }, { status: 500 });

  const { data: newVersion, error: newVersionError } = await supabase
    .from("flow_workflow_versions")
    .insert({
      account_id: accountId,
      workflow_id: workflowId,
      version_number: (version?.version_number ?? 0) + 1,
      status: "draft",
      definition: body.definition,
      trigger_event_id: body.triggerEventId ?? null,
      created_by: userId,
    })
    .select("id, workflow_id, version_number, status, definition, trigger_event_id, created_at, updated_at")
    .single();

  if (newVersionError || !newVersion) {
    console.error("[flows] workflow version update failed", { accountId, workflowId, newVersionError });
    return NextResponse.json({ error: "Unable to save flow version" }, { status: 500 });
  }

  return NextResponse.json({ workflow, version: newVersion });
}
