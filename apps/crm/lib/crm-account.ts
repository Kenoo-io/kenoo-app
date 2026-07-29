/**
 * Client-safe CRM tenancy helpers.
 * Every people / companies / deals / sequences / pitches / deal_stages row is
 * keyed by Kenoo `accounts.id`. Filter reads and stamp writes with the active
 * account so the switcher actually changes the dataset.
 *
 * RLS is still deferred (walls-app / Apollo plain-anon clients). App-level
 * filters are the Phase 2 tenancy boundary until that cutover lands.
 */

type EqQuery = {
  eq: (column: string, value: unknown) => EqQuery;
};

/** Append `.eq("account_id", accountId)` to a Supabase query builder. */
export function withCrmAccount<T>(query: T, accountId: string): T {
  const scoped = query as EqQuery;
  return scoped.eq("account_id", accountId) as T;
}

/** Fields to spread into insert/update payloads. */
export function crmAccountFields(accountId: string) {
  return { account_id: accountId };
}

export function rowBelongsToCrmAccount(
  row: { account_id?: string | null },
  accountId: string,
): boolean {
  return row.account_id === accountId;
}
