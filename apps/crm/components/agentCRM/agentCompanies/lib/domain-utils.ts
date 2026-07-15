/** Domain or subdomain only — no protocol, path, or trailing slash. */
const BARE_DOMAIN_PATTERN =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

export const BARE_DOMAIN_ERROR =
  "Enter domain only (e.g. wallsentertainment.com or admin.wallsentertainment.com)";

/** True when input is a bare domain/subdomain (not a URL). */
export function isBareDomainInput(raw: string): boolean {
  const input = raw.trim();
  if (!input) return false;
  if (/[:\/?#\s]/.test(input)) return false;
  return BARE_DOMAIN_PATTERN.test(input);
}

/** Normalize a valid bare domain for storage (lowercase, strips leading www.). */
export function normalizeBareDomain(raw: string): string | null {
  const input = raw.trim().toLowerCase();
  if (!isBareDomainInput(input)) return null;
  return input.replace(/^www\./, "");
}

/** Derive website from domain: https://www.{domain} with no trailing slash. */
export function bareDomainToWebsite(domain: string): string {
  const normalized =
    normalizeBareDomain(domain) ??
    domain.trim().toLowerCase().replace(/^www\./, "");
  return `https://www.${normalized}`;
}
