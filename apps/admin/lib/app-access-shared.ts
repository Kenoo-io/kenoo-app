export type AppAccessRecord = {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
};

/** Internal Kenoo surfaces — never grantable from organization settings. */
export const ORG_MANAGED_APP_EXCLUDED_SLUGS = [
  "admin",
  "console",
  "platform",
] as const;

export function isOrgManagedAppSlug(slug: string): boolean {
  return !(ORG_MANAGED_APP_EXCLUDED_SLUGS as readonly string[]).includes(slug);
}
