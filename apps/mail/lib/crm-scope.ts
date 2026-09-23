import {
  getCurrentUserId,
  resolveActiveAccountId,
} from "@/lib/account-context";
import { crmAccountFields, withCrmAccount } from "@/lib/crm-account";

/**
 * Server-side CRM tenancy scope (API routes, RSC). Mirrors AdPilot's
 * `getAdDataScope` / `withAdScope`.
 */
export type CrmDataScope = {
  accountId: string;
  userId: string;
};

export async function getCrmDataScope(): Promise<CrmDataScope | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) return null;

  return { accountId, userId };
}

export { crmAccountFields, withCrmAccount };

export function withCrmScope<T>(query: T, scope: CrmDataScope): T {
  return withCrmAccount(query, scope.accountId);
}

export function crmScopeFields(scope: CrmDataScope) {
  return crmAccountFields(scope.accountId);
}
