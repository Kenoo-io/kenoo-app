import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: requireEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export function getR2Bucket(): string {
  return requireEnv("R2_BUCKET");
}

export function getR2PublicUrl(key: string): string {
  const base = requireEnv("R2_PUBLIC_BASE").replace(/\/$/, "");
  return `${base}/${key}`;
}

export async function deleteObjectsWithPrefix(prefix: string): Promise<void> {
  const r2 = getR2Client();
  const bucket = getR2Bucket();

  let continuationToken: string | undefined;
  do {
    const list = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of list.Contents ?? []) {
      if (!obj.Key) continue;
      await r2.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: obj.Key,
        }),
      );
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
}

export async function putImageObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const r2 = getR2Client();
  const bucket = getR2Bucket();

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const r2 = getR2Client();
  const bucket = getR2Bucket();

  await r2.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function getR2DownloadUrl({
  key,
  contentType,
  contentDisposition,
  expiresIn = 300,
}: {
  key: string;
  contentType?: string;
  contentDisposition?: string;
  expiresIn?: number;
}): Promise<string> {
  const url = await getSignedUrl(
    // The repo currently resolves slightly different Smithy type versions for
    // the S3 client and presigner; both are AWS SDK-compatible at runtime.
    getR2Client() as unknown as Parameters<typeof getSignedUrl>[0],
    new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ResponseContentType: contentType,
      ResponseContentDisposition: contentDisposition,
    }) as unknown as Parameters<typeof getSignedUrl>[1],
    { expiresIn },
  );

  return url;
}
