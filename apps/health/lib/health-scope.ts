import { getCurrentUserId } from "@/lib/connections-server";

export type HealthDataScope = {
  userId: string;
};

type ScopedQuery = {
  eq: (column: string, value: unknown) => ScopedQuery;
};

export async function getHealthDataScope(): Promise<HealthDataScope | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return { userId };
}

export function withHealthScope<T>(query: T, scope: HealthDataScope): T {
  const scoped = query as ScopedQuery;
  return scoped.eq("user_id", scope.userId) as T;
}

export function healthScopeFields(scope: HealthDataScope) {
  return {
    user_id: scope.userId,
  };
}
