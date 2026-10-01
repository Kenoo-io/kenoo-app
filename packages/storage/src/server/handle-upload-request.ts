import { createClient } from "@walls/supabase/server";

import type { ImageUploadTarget, UploadImageResult } from "./types";
import { uploadImage } from "./upload-image";

function parseUploadTarget(raw: FormDataEntryValue | null): ImageUploadTarget {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Upload target is required");
  }

  const parsed = JSON.parse(raw) as ImageUploadTarget;

  if (parsed.kind === "user-avatar") {
    return parsed;
  }

  if (parsed.kind === "organization-icon" && parsed.organizationId) {
    return parsed;
  }

  if (
    parsed.kind === "branding-logo" &&
    parsed.accountId &&
    (parsed.variant === "dark" || parsed.variant === "light")
  ) {
    return parsed;
  }

  throw new Error("Invalid upload target");
}

export async function handleUploadImageRequest(
  request: Request,
): Promise<UploadImageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UploadImageRequestError("Unauthenticated", 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new UploadImageRequestError("Image file is required", 400);
  }

  const target = parseUploadTarget(formData.get("target"));

  try {
    return await uploadImage({
      supabase,
      authUser: user,
      file,
      target,
    });
  } catch (error) {
    if (error instanceof UploadImageRequestError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Failed to upload image";

    if (message === "Forbidden") {
      throw new UploadImageRequestError(message, 403);
    }

    if (message === "Unauthenticated") {
      throw new UploadImageRequestError(message, 401);
    }

    throw new UploadImageRequestError(message, 500);
  }
}

export class UploadImageRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UploadImageRequestError";
    this.status = status;
  }
}
