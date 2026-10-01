import { NextResponse } from "next/server";

import { createClient } from "@walls/supabase/server";

import { requireFlowsAccount } from "@/lib/api-key-auth";

export async function POST(request: Request) {
  const auth = await requireFlowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({})) as { uploadIds?: unknown; folderIds?: unknown };
  const uploadIds = Array.isArray(body.uploadIds) ? body.uploadIds.filter((value): value is string => typeof value === "string") : [];
  const folderIds = Array.isArray(body.folderIds) ? body.folderIds.filter((value): value is string => typeof value === "string") : [];
  if (!uploadIds.length || !folderIds.length) return NextResponse.json({ error: "Choose at least one image and folder" }, { status: 400 });

  const supabase = await createClient();
  const { data: uploads, error: uploadError } = await supabase
    .from("flows_template_uploads")
    .select("id")
    .eq("account_id", auth.accountId)
    .in("id", uploadIds);
  if (uploadError) return NextResponse.json({ error: "Unable to validate images" }, { status: 500 });
  if ((uploads ?? []).length !== new Set(uploadIds).size) return NextResponse.json({ error: "One or more images were not found" }, { status: 404 });

  const { data: folders, error: folderError } = await supabase
    .from("flows_upload_folders")
    .select("id")
    .eq("account_id", auth.accountId)
    .in("id", folderIds);
  if (folderError) return NextResponse.json({ error: "Unable to validate folders" }, { status: 500 });
  if ((folders ?? []).length !== new Set(folderIds).size) return NextResponse.json({ error: "One or more folders were not found" }, { status: 404 });

  const memberships = [...new Set(uploadIds)].flatMap((uploadId) => [...new Set(folderIds)].map((folderId) => ({ account_id: auth.accountId, upload_id: uploadId, folder_id: folderId })));
  const { error } = await supabase.from("flows_template_upload_folder_memberships").upsert(memberships, { onConflict: "account_id,upload_id,folder_id", ignoreDuplicates: true });
  if (error) {
    console.error("[flows] upload folder memberships insert failed", { accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to add images to folders" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireFlowsAccount();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({})) as { uploadIds?: unknown; folderIds?: unknown };
  const uploadIds = body.uploadIds && Array.isArray(body.uploadIds) ? body.uploadIds.filter((value): value is string => typeof value === "string") : [];
  const folderIds = body.folderIds && Array.isArray(body.folderIds) ? body.folderIds.filter((value): value is string => typeof value === "string") : [];
  if (!uploadIds.length || !folderIds.length) return NextResponse.json({ error: "Choose at least one image and folder" }, { status: 400 });

  const supabase = await createClient();
  const { data: uploads, error: uploadError } = await supabase
    .from("flows_template_uploads")
    .select("id")
    .eq("account_id", auth.accountId)
    .in("id", [...new Set(uploadIds)]);
  if (uploadError) return NextResponse.json({ error: "Unable to validate images" }, { status: 500 });
  if ((uploads ?? []).length !== new Set(uploadIds).size) return NextResponse.json({ error: "One or more images were not found" }, { status: 404 });

  const { data: folders, error: folderError } = await supabase
    .from("flows_upload_folders")
    .select("id")
    .eq("account_id", auth.accountId)
    .in("id", [...new Set(folderIds)]);
  if (folderError) return NextResponse.json({ error: "Unable to validate folders" }, { status: 500 });
  if ((folders ?? []).length !== new Set(folderIds).size) return NextResponse.json({ error: "One or more folders were not found" }, { status: 404 });

  const { error } = await supabase
    .from("flows_template_upload_folder_memberships")
    .delete()
    .eq("account_id", auth.accountId)
    .in("upload_id", [...new Set(uploadIds)])
    .in("folder_id", [...new Set(folderIds)]);
  if (error) {
    console.error("[flows] upload folder memberships delete failed", { accountId: auth.accountId, error });
    return NextResponse.json({ error: "Unable to remove images from folders" }, { status: 500 });
  }

  const { error: legacyFolderError } = await supabase
    .from("flows_template_uploads")
    .update({ folder_id: null })
    .eq("account_id", auth.accountId)
    .in("id", [...new Set(uploadIds)])
    .in("folder_id", [...new Set(folderIds)]);
  if (legacyFolderError) return NextResponse.json({ error: "Unable to remove images from folders" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
