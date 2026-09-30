/** R2 key prefixes — one folder per entity; old files in the folder are replaced on upload. */
export function userAvatarPrefix(userId: string): string {
  return `roster-profile-pictures/${userId}/`;
}

export function organizationIconPrefix(organizationId: string): string {
  return `organization-icons/${organizationId}/`;
}

export function brandingLogoPrefix(accountId: string, variant: "dark" | "light"): string {
  return `account-branding/${accountId}/${variant}/`;
}
