import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "knp_live_";

export function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKey(): {
  secret: string;
  prefix: string;
  hash: string;
} {
  const secret = `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  return {
    secret,
    prefix: secret.slice(0, 12),
    hash: hashApiKey(secret),
  };
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
