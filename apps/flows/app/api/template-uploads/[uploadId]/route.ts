import { NextResponse } from "next/server";

import { deleteObject } from "@walls/storage/server";
import { createClient } from "@walls/supabase/server";

import { requireFlowsAccount } from "@/lib/api-key-auth";

type RouteContext = { params: Promise<{ uploadId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireFlowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { uploadId } = await context.params;
  const supabase = await createClient();
  const { data: upload, error: loadError } = await supabase
    .from("flows_template_uploads")
    .select("id, storage_key")
    .eq("id", uploadId)
    .eq("account_id", auth.accountId)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: "Unable to load upload" }, { status: 500 });
  if (!upload) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

  try {
    await deleteObject(upload.storage_key);
  } catch (error) {
    console.error("[flows] template upload object deletion failed", { uploadId, error });
    return NextResponse.json({ error: "Unable to delete uploaded image" }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("flows_template_uploads")
    .delete()
    .eq("id", uploadId)
    .eq("account_id", auth.accountId);

  if (deleteError) return NextResponse.json({ error: "Unable to delete upload metadata" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
