type SupabaseLike = {
  from: (table: string) => any;
};

export async function fetchPersonAccountOverrides(
  supabase: SupabaseLike,
  accountId: string | null | undefined,
  personIds: string[]
) {
  const ids = Array.from(new Set(personIds.filter(Boolean)));
  if (!accountId || ids.length === 0) return new Map<string, { first_name?: string | null; last_name?: string | null }>();

  const { data } = await supabase
    .from("person_account_overrides")
    .select("person_id, first_name, last_name")
    .eq("account_id", accountId)
    .in("person_id", ids);

  return new Map((data || []).map((override: any) => [override.person_id, override]));
}

export function getEffectivePersonName(
  person: { first_name?: string | null; last_name?: string | null } | null | undefined,
  override?: { first_name?: string | null; last_name?: string | null }
) {
  const firstName = override?.first_name ?? person?.first_name ?? "";
  const lastName = override?.last_name ?? person?.last_name ?? "";
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
  };
}
