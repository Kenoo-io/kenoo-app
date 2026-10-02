/** Cloudflare Image Resizing URLs for the Workflows asset zone. */

export const CF_ASSETS_ORIGIN =
  process.env.NEXT_PUBLIC_CF_ASSETS_ORIGIN ?? "https://assets.kenoo.io";

const CF_IMAGE_SEGMENT = "/cdn-cgi/image/";

export function optimizeImageUrl(
  url: string | null | undefined,
  width: number,
  quality = 78,
): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.includes(CF_IMAGE_SEGMENT)) return trimmed;

  try {
    const parsed = new URL(trimmed, CF_ASSETS_ORIGIN);
    const origin = new URL(CF_ASSETS_ORIGIN).origin;
    if (parsed.origin !== origin) return trimmed;
    const options = `width=${Math.round(width)},quality=${quality},format=auto,fit=cover`;
    return `${origin}${CF_IMAGE_SEGMENT}${options}${parsed.pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}
