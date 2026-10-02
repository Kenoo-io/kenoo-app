import { NextResponse } from "next/server";

import { getR2DownloadUrl } from "@walls/storage/server";
import { createClient } from "@walls/supabase/server";

import { requireWorkflowsAccount } from "@/lib/api-key-auth";

type RouteContext = { params: Promise<{ uploadId: string }> };

function downloadName(name: string): string {
  return name.replace(/[\\"\r\n]+/g, "-").trim().slice(0, 160) || "download";
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireWorkflowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { uploadId } = await context.params;
  const supabase = await createClient();
  const { data: upload, error } = await supabase
    .from("workflows_template_uploads")
    .select("id, original_name, storage_key, mime_type, size_bytes")
    .eq("id", uploadId)
    .eq("account_id", auth.accountId)
    .maybeSingle();

  if (error) {
    console.error("[workflows] download metadata lookup failed", { uploadId, accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to prepare download" }, { status: 500 });
  }
  if (!upload) {
    console.warn("[workflows] download requested for missing upload", { uploadId, accountId: auth.accountId });
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  try {
    const name = downloadName(upload.original_name);
    const contentDisposition = `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`;
    const signedUrl = await getR2DownloadUrl({
      key: upload.storage_key,
      contentType: upload.mime_type,
      contentDisposition,
    });

    console.info("[workflows] prepared upload download", {
      uploadId,
      accountId: auth.accountId,
      mimeType: upload.mime_type,
      sizeBytes: upload.size_bytes,
      expiresInSeconds: 300,
    });
    return NextResponse.redirect(signedUrl);
  } catch (downloadError) {
    console.error("[workflows] R2 download URL generation failed", {
      uploadId,
      accountId: auth.accountId,
      error: downloadError,
    });
    return NextResponse.json({ error: "Unable to prepare download" }, { status: 500 });
  }
}
