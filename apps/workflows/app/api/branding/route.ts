import { NextResponse } from "next/server";

import { createAdminClient } from "@walls/supabase/admin";
import { handleUploadImageRequest, UploadImageRequestError } from "@walls/storage/server";

import { canManageWorkflowsKeys, requireWorkflowsAccount } from "@/lib/api-key-auth";

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export async function GET() {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createAdminClient();
  const { data, error } = await admin.from("account_branding").select("primary_color, secondary_color, dark_logo_url, light_logo_url").eq("account_id", auth.accountId).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load branding settings" }, { status: 500 });
  return NextResponse.json({ branding: data ?? { primary_color: "#111111", secondary_color: "#f4f4f5", dark_logo_url: null, light_logo_url: null }, canManage: canManageWorkflowsKeys(auth.role) });
}

export async function PATCH(request: Request) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canManageWorkflowsKeys(auth.role)) return NextResponse.json({ error: "Only workspace owners and admins can manage branding" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { primaryColor?: string; secondaryColor?: string };
  const updates: Record<string, string> = {};
  if (body.primaryColor !== undefined) {
    if (!COLOR_PATTERN.test(body.primaryColor)) return NextResponse.json({ error: "Primary color must be a six-digit hex color" }, { status: 400 });
    updates.primary_color = body.primaryColor;
  }
  if (body.secondaryColor !== undefined) {
    if (!COLOR_PATTERN.test(body.secondaryColor)) return NextResponse.json({ error: "Secondary color must be a six-digit hex color" }, { status: 400 });
    updates.secondary_color = body.secondaryColor;
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "No branding changes provided" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("account_branding").upsert({ account_id: auth.accountId, ...updates, updated_at: new Date().toISOString() }, { onConflict: "account_id" }).select("primary_color, secondary_color, dark_logo_url, light_logo_url").single();
  if (error) return NextResponse.json({ error: "Unable to save branding settings" }, { status: 500 });
  return NextResponse.json({ branding: data });
}

export async function POST(request: Request) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canManageWorkflowsKeys(auth.role)) return NextResponse.json({ error: "Only workspace owners and admins can manage branding" }, { status: 403 });
  try {
    const formData = await request.formData();
    const targetValue = formData.get("target");
    const target = typeof targetValue === "string" ? (JSON.parse(targetValue) as { kind?: string; variant?: string }) : null;
    if (target?.kind !== "branding-logo" || (target.variant !== "dark" && target.variant !== "light")) {
      return NextResponse.json({ error: "Invalid branding logo target" }, { status: 400 });
    }
    formData.set("target", JSON.stringify({ kind: "branding-logo", accountId: auth.accountId, variant: target.variant }));
    const result = await handleUploadImageRequest(new Request(request.url, { method: "POST", body: formData }));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UploadImageRequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload logo" }, { status: 500 });
  }
}
