import { NextResponse } from "next/server";

import {
  deleteObject,
  getR2PublicUrl,
  putImageObject,
} from "@walls/storage/server";
import { createClient } from "@walls/supabase/server";

import { requireFlowsAccount } from "@/lib/api-key-auth";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extensionFor(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return file.type.split("/").pop() === "jpeg" ? "jpg" : file.type.split("/").pop() || "bin";
}

function safeOriginalName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 160) || "image";
}

export async function GET() {
  const auth = await requireFlowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flows_template_uploads")
    .select("id, original_name, storage_key, public_url, mime_type, size_bytes, created_at, updated_at")
    .eq("account_id", auth.accountId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[flows] template uploads load failed", { accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to load uploads" }, { status: 500 });
  }

  return NextResponse.json({ uploads: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireFlowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPG, GIF, and WebP images are supported" }, { status: 400 });
  }
  if (!file.size || file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "Images must be smaller than 10 MB" }, { status: 400 });
  }

  const storageKey = `flows/template-uploads/${auth.accountId}/${crypto.randomUUID()}-${safeOriginalName(file.name)}`;
  const supabase = await createClient();

  try {
    await putImageObject(storageKey, Buffer.from(await file.arrayBuffer()), file.type);

    const { data, error } = await supabase
      .from("flows_template_uploads")
      .insert({
        account_id: auth.accountId,
        created_by: auth.userId,
        original_name: file.name,
        storage_key: storageKey,
        public_url: getR2PublicUrl(storageKey),
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select("id, original_name, storage_key, public_url, mime_type, size_bytes, created_at, updated_at")
      .single();

    if (error) {
      await deleteObject(storageKey).catch((cleanupError) => console.error("[flows] orphaned upload cleanup failed", cleanupError));
      console.error("[flows] template upload metadata insert failed", { accountId: auth.accountId, error });
      return NextResponse.json({ error: "Unable to save upload metadata" }, { status: 500 });
    }

    return NextResponse.json({ upload: data }, { status: 201 });
  } catch (error) {
    await deleteObject(storageKey).catch(() => undefined);
    console.error("[flows] template upload failed", { accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to upload image" }, { status: 500 });
  }
}
