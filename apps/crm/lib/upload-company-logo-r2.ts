import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export async function uploadCompanyLogoToR2(
  image: File,
  companyId: string
): Promise<{ message: string; downloadUrl: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthenticated");
  }

  if (!companyId?.trim()) {
    throw new Error("Missing company id");
  }

  if (!image.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  if (image.size > 5 * 1024 * 1024) {
    throw new Error("File size should be less than 5MB");
  }

  const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const basePrefix = `company-logos/${companyId.trim()}/`;

  const existing = await r2.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!,
      Prefix: basePrefix,
    })
  );

  if (existing.Contents) {
    for (const obj of existing.Contents) {
      if (!obj.Key) continue;
      await r2.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET!,
          Key: obj.Key,
        })
      );
    }
  }

  const ext = image.name.split(".").pop() || "jpg";
  const key = `${basePrefix}${uuidv4()}.${ext}`;
  const imageBuffer = Buffer.from(await image.arrayBuffer());

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: imageBuffer,
      ContentType: image.type,
    })
  );

  const downloadUrl = `${process.env.R2_PUBLIC_BASE}/${key}`;

  return {
    message: "Company logo uploaded successfully",
    downloadUrl,
  };
}
