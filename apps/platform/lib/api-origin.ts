export function getPublicApiOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const platform = process.env.NEXT_PUBLIC_PLATFORM_URL?.trim();
  if (platform) return platform.replace(/\/$/, "");

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3014";
  }

  return "https://platform.kenoo.io";
}

export function getPublicApiBase(): string {
  return `${getPublicApiOrigin()}/api/v1`;
}
