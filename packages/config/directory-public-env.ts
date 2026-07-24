/**
 * Directory app origins for the profile launcher / SSO redirects.
 * Spread into each app's `next.config` `env` so client bundles can resolve
 * local (`http://localhost:…`) vs production (`https://*.kenoo.io`) URLs.
 */
export function getDirectoryPublicEnv(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_BASE_URL: env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_WALLS_AGENCY_URL: env.NEXT_PUBLIC_WALLS_AGENCY_URL,
    NEXT_PUBLIC_PORTAL_URL: env.NEXT_PUBLIC_PORTAL_URL,
    NEXT_PUBLIC_ADPILOT_URL: env.NEXT_PUBLIC_ADPILOT_URL,
    NEXT_PUBLIC_WALLIE_URL: env.NEXT_PUBLIC_WALLIE_URL,
    NEXT_PUBLIC_SETTINGS_URL: env.NEXT_PUBLIC_SETTINGS_URL,
    NEXT_PUBLIC_HEALTH_URL: env.NEXT_PUBLIC_HEALTH_URL,
    NEXT_PUBLIC_CALENDAR_URL: env.NEXT_PUBLIC_CALENDAR_URL,
    NEXT_PUBLIC_PROJECTS_URL: env.NEXT_PUBLIC_PROJECTS_URL,
    NEXT_PUBLIC_ADMIN_URL: env.NEXT_PUBLIC_ADMIN_URL,
    NEXT_PUBLIC_CRM_URL: env.NEXT_PUBLIC_CRM_URL,
    NEXT_PUBLIC_LEDGER_URL: env.NEXT_PUBLIC_LEDGER_URL,
    NEXT_PUBLIC_CONSOLE_URL: env.NEXT_PUBLIC_CONSOLE_URL,
    NEXT_PUBLIC_MAIL_URL: env.NEXT_PUBLIC_MAIL_URL,
    NEXT_PUBLIC_PARTNERHUB_URL: env.NEXT_PUBLIC_PARTNERHUB_URL,
  };
}
