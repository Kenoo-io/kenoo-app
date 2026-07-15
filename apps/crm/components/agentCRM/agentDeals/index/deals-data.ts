import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { Deal, Filters } from "./types";

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

export function escapeIlike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export interface DealsSortState {
  sortDirection: "asc" | "desc";
  isSortingByRecency: boolean;
  isSortingByName: boolean;
  isSortingByStage: boolean;
}

export interface BuildDealsQueryParams {
  filters: Filters;
  currentUserId: string | null;
  debouncedSearchTerm: string;
  sort: DealsSortState;
  withCount: boolean;
  /** Kanban shows the full pipeline — all stages and deal statuses, not list-style defaults. */
  forKanban?: boolean;
}

/** Builds (but does not execute) the base `deals` query shared by the table and kanban views. */
export function buildDealsQuery(supabase: SupabaseClient, params: BuildDealsQueryParams) {
  const { filters, currentUserId, debouncedSearchTerm, sort, withCount, forKanban = false } = params;
  const { sortDirection, isSortingByRecency, isSortingByName, isSortingByStage } = sort;

  const searchTerm = debouncedSearchTerm.trim().toLowerCase();
  const searchTerms = searchTerm ? searchTerm.split(/\s+/).filter(Boolean) : [];
  // Default to active; "all" means no filter. Kanban always shows every stage/status.
  const effectiveStatus = forKanban
    ? null
    : filters.status === ""
      ? "active"
      : filters.status === "all"
        ? null
        : filters.status;
  const filterByStage = !forKanban && Boolean(effectiveStatus || filters.stage);
  const stagesSelect = filterByStage
    ? "deal_stages!inner ( id, name, slug, is_won, is_lost, order_index, probability )"
    : "deal_stages ( id, name, slug, is_won, is_lost, order_index, probability )";

  let query = supabase
    .from("deals")
    .select(
      `
      id,
      deal_name,
      source,
      deal_type,
      deal_stage_id,
      deal_owner,
      created_at,
      updated_at,
      ${stagesSelect},
      users!deals_deal_owner_fkey (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `,
      withCount ? { count: "exact" } : undefined
    );

  if (effectiveStatus === "active") {
    query = query.eq("deal_stages.is_won", false).eq("deal_stages.is_lost", false);
  } else if (effectiveStatus === "won") {
    query = query.eq("deal_stages.is_won", true);
  } else if (effectiveStatus === "lost") {
    query = query.eq("deal_stages.is_lost", true);
  }
  if (!forKanban && filters.stage) {
    query = query.eq("deal_stages.name", filters.stage);
  }
  // Default to current user; "all" means no filter (same for table and kanban).
  const effectiveDealOwner =
    filters.owner === ""
      ? currentUserId
      : filters.owner === "all"
        ? null
        : filters.owner;
  if (effectiveDealOwner) query = query.eq("deal_owner", effectiveDealOwner);
  for (const term of searchTerms) {
    const pattern = `%${escapeIlike(term)}%`;
    query = query.ilike("deal_name", pattern);
  }

  if (isSortingByRecency) {
    query = query.order("created_at", { ascending: sortDirection === "asc" });
  } else if (isSortingByName) {
    query = query.order("deal_name", { ascending: sortDirection === "asc" });
  } else if (isSortingByStage) {
    query = query.order("deal_stages(order_index)", { ascending: sortDirection === "asc" });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  return query;
}

/**
 * Enriches raw `deals` rows (from `buildDealsQuery`) with company, deliverables/value,
 * talent, and contacts data, and maps them into the `Deal` shape used by the table and kanban views.
 */
export async function mapRawDealsToDeals(
  supabase: SupabaseClient,
  dealsDataRaw: any[] | null
): Promise<Deal[]> {
  const dealIds = (dealsDataRaw || []).map((d: any) => d.id).filter(Boolean);
  if (dealIds.length === 0) return [];

  // Fetch deal_companies with companies (for client company per deal)
  const { data: dealCompaniesData } = await supabase
    .from('deal_companies')
    .select(`
      deal_id,
      company_id,
      role,
      companies (
        id,
        name,
        website,
        logo_url
      )
    `)
    .in('deal_id', dealIds);

  const companyByDealId = new Map<string, any>();
  const byDeal = new Map<string, any[]>();
  (dealCompaniesData || []).forEach((dc: any) => {
    const company = Array.isArray(dc.companies) ? dc.companies[0] : dc.companies;
    if (company) {
      const list = byDeal.get(dc.deal_id) || [];
      list.push({ ...company, role: dc.role });
      byDeal.set(dc.deal_id, list);
    }
  });
  byDeal.forEach((list, dealId) => {
    const client = list.find((c: any) => c.role === 'client');
    companyByDealId.set(dealId, client || list[0]);
  });

  // Fetch deal_deliverables for value sum and (optional) billing_type for Billing column
  const amountByDealId = new Map<string, number>();
  const mrrAmountByDealId = new Map<string, number>();
  const valueAmountByDealId = new Map<string, number>();
  const billingTypesByDealId = new Map<string, ('one_off' | 'recurring' | 'time_based')[]>();
  /** For recurring with no recurrence_count: first billing_interval seen per deal (used for MRR/ARR/WRR/BWRR/QRR label) */
  const recurringNoCountIntervalByDealId = new Map<string, string>();
  /** Deal has at least one recurring row with recurrence_count > 0 → do not show MRR/ARR etc. */
  const dealHasRecurringWithCount = new Set<string>();

  /** Per-deal, per-currency grouped amounts for display */
  interface CurrencyGroup { mrr: number; value: number; mrrInterval: string | null; }
  const currencyGroupsByDeal = new Map<string, Map<string, CurrencyGroup>>();

  const { data: deliverablesData, error: deliverablesError } = await supabase
    .from('deal_deliverables')
    .select('deal_id, quantity, unit_price_cents, currency, billing_type, recurrence_count, billing_interval')
    .in('deal_id', dealIds);

  if (deliverablesError) {
    console.warn('Deal deliverables fetch failed (Value/Billing columns may be empty):', deliverablesError.message);
  }

  const billingIntervalToValueLabel = (interval: string | null | undefined): string => {
    if (!interval) return ' MRR';
    const i = String(interval).toLowerCase().replace(/-/g, '_');
    if (i === 'yearly' || i === 'annual') return ' ARR';
    if (i === 'monthly') return ' MRR';
    if (i === 'weekly') return ' WRR';
    if (i === 'bi_weekly' || i === 'biweekly') return ' BWRR';
    if (i === 'quarterly') return ' QRR';
    return ' MRR';
  };

  const formatDealCurrency = (amount: number, currency: string, narrowSymbol: boolean): string => {
    const normalized = (currency || "USD").toUpperCase();
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...(narrowSymbol ? { currencyDisplay: "narrowSymbol" as const } : {}),
    }).format(amount);

    if (normalized === "CAD") return formatted.replace("$", "CA$");
    if (normalized === "AUD") return formatted.replace("$", "AU$");
    return formatted;
  };

  const fmtCurrency = (amount: number, currency: string) => formatDealCurrency(amount, currency, false);

  /** Omit currency buckets with no money (e.g. default USD row from time_based deliverable with $0 before CAD time totals). */
  const currencyBucketIsEmpty = (g: CurrencyGroup) =>
    Math.abs(g.mrr) < 0.005 && Math.abs(g.value) < 0.005;

  const fmtCurrencyForDisplay = (amount: number, currency: string, narrowSymbol: boolean) =>
    formatDealCurrency(amount, currency, narrowSymbol);

  (deliverablesData || []).forEach((d: any) => {
    const currency = d.currency || 'USD';
    const current = amountByDealId.get(d.deal_id) || 0;
    const q = Number(d.quantity) || 0;
    const c = Number(d.unit_price_cents) || 0;
    let lineTotal = (q * c) / 100;
    const isRecurring = d.billing_type === 'recurring';
    const recur = d.recurrence_count != null ? Number(d.recurrence_count) || 0 : 0;

    // Per-currency grouping
    if (!currencyGroupsByDeal.has(d.deal_id)) currencyGroupsByDeal.set(d.deal_id, new Map());
    const groups = currencyGroupsByDeal.get(d.deal_id)!;
    if (!groups.has(currency)) groups.set(currency, { mrr: 0, value: 0, mrrInterval: null });
    const group = groups.get(currency)!;

    if (isRecurring && recur > 0) {
      lineTotal *= recur;
      dealHasRecurringWithCount.add(d.deal_id);
      valueAmountByDealId.set(d.deal_id, (valueAmountByDealId.get(d.deal_id) || 0) + lineTotal);
      group.value += lineTotal;
    } else if (isRecurring && (d.recurrence_count == null || recur === 0)) {
      if (!recurringNoCountIntervalByDealId.has(d.deal_id)) {
        recurringNoCountIntervalByDealId.set(d.deal_id, d.billing_interval ?? 'monthly');
      }
      if (!group.mrrInterval) group.mrrInterval = d.billing_interval ?? 'monthly';
      mrrAmountByDealId.set(d.deal_id, (mrrAmountByDealId.get(d.deal_id) || 0) + lineTotal);
      group.mrr += lineTotal;
    } else {
      valueAmountByDealId.set(d.deal_id, (valueAmountByDealId.get(d.deal_id) || 0) + lineTotal);
      group.value += lineTotal;
    }
    amountByDealId.set(d.deal_id, current + lineTotal);
  });

  const buildAmountDisplay = (dealId: string): string => {
    const groups = currencyGroupsByDeal.get(dealId);
    if (!groups || groups.size === 0) return fmtCurrency(0, 'USD');
    const filtered = Array.from(groups.entries()).filter(([, g]) => !currencyBucketIsEmpty(g));
    if (filtered.length === 0) return fmtCurrency(0, 'USD');
    const narrow = filtered.length === 1;
    const parts: string[] = [];
    for (const [currency, group] of filtered) {
      const mrrLabel = billingIntervalToValueLabel(group.mrrInterval);
      const fmt = (amount: number) => fmtCurrencyForDisplay(amount, currency, narrow);
      if (group.mrr > 0 && group.value > 0) {
        parts.push(`${fmt(group.mrr)}${mrrLabel} + ${fmt(group.value)}`);
      } else if (group.mrr > 0) {
        parts.push(`${fmt(group.mrr)}${mrrLabel}`);
      } else {
        parts.push(fmt(group.value));
      }
    }
    return parts.join(' + ');
  };

  const { data: billingData } = await supabase
    .from('deal_deliverables')
    .select('deal_id, billing_type')
    .in('deal_id', dealIds);

  (billingData || []).forEach((d: any) => {
    if (d.billing_type != null) {
      const bt = d.billing_type === 'recurring' ? 'recurring' : d.billing_type === 'time_based' ? 'time_based' : 'one_off';
      const list = billingTypesByDealId.get(d.deal_id) || [];
      list.push(bt);
      billingTypesByDealId.set(d.deal_id, list);
    }
  });

  const timeBasedDealIds = Array.from(
    new Set(
      (billingData || [])
        .filter((d: any) => d.billing_type === 'time_based')
        .map((d: any) => d.deal_id)
        .filter(Boolean)
    )
  );

  if (timeBasedDealIds.length > 0) {
    let { data: timeEntriesData, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select('deal_id, duration_seconds, hourly_rate_cents, is_billable, currency:billable_currency')
      .in('deal_id', timeBasedDealIds);

    // Backward compatibility: some DBs might not have billable_currency yet.
    if (timeEntriesError && String(timeEntriesError.message ?? "").toLowerCase().includes("billable_currency")) {
      const retry = await supabase
        .from('time_entries')
        .select('deal_id, duration_seconds, hourly_rate_cents, is_billable')
        .in('deal_id', timeBasedDealIds);
      timeEntriesData = retry.data as any;
      timeEntriesError = retry.error;
    }

    if (timeEntriesError) {
      console.warn('Time entries fetch failed (time-based Value may be incomplete):', timeEntriesError.message);
    } else {
      const timeBasedDollarsByDeal = new Map<string, number>();
      const timeBasedDollarsByDealCurrency = new Map<string, Map<string, number>>();
      (timeEntriesData || []).forEach((entry: any) => {
        if (!entry?.is_billable) return;
        const seconds = Number(entry.duration_seconds);
        const hourlyRateCents = Number(entry.hourly_rate_cents);
        const currency = (entry.currency || 'USD').toUpperCase();
        if (!Number.isFinite(seconds) || !Number.isFinite(hourlyRateCents)) return;
        const lineDollars = ((seconds / 3600) * hourlyRateCents) / 100;
        if (!Number.isFinite(lineDollars) || lineDollars <= 0) return;
        timeBasedDollarsByDeal.set(
          entry.deal_id,
          (timeBasedDollarsByDeal.get(entry.deal_id) || 0) + lineDollars
        );
        if (!timeBasedDollarsByDealCurrency.has(entry.deal_id)) {
          timeBasedDollarsByDealCurrency.set(entry.deal_id, new Map());
        }
        const perCurrency = timeBasedDollarsByDealCurrency.get(entry.deal_id)!;
        perCurrency.set(currency, (perCurrency.get(currency) || 0) + lineDollars);
      });

      timeBasedDollarsByDeal.forEach((billableDollars, dealId) => {
        amountByDealId.set(dealId, (amountByDealId.get(dealId) || 0) + billableDollars);
        valueAmountByDealId.set(dealId, (valueAmountByDealId.get(dealId) || 0) + billableDollars);

        if (!currencyGroupsByDeal.has(dealId)) currencyGroupsByDeal.set(dealId, new Map());
        const groups = currencyGroupsByDeal.get(dealId)!;
        const perCurrency = timeBasedDollarsByDealCurrency.get(dealId);
        if (!perCurrency || perCurrency.size === 0) {
          const currency = 'USD';
          if (!groups.has(currency)) groups.set(currency, { mrr: 0, value: 0, mrrInterval: null });
          groups.get(currency)!.value += billableDollars;
          return;
        }
        perCurrency.forEach((amount, currency) => {
          if (!groups.has(currency)) groups.set(currency, { mrr: 0, value: 0, mrrInterval: null });
          groups.get(currency)!.value += amount;
        });
      });
    }
  }

  const getRecurrenceLabel = (dealId: string): string => {
    const types = billingTypesByDealId.get(dealId) || [];
    if (types.length === 0) return '—';
    const hasOneOff = types.some((t) => t === 'one_off');
    const hasRecurring = types.some((t) => t === 'recurring');
    const hasTimeBased = types.some((t) => t === 'time_based');
    const activeTypeCount = [hasOneOff, hasRecurring, hasTimeBased].filter(Boolean).length;
    if (activeTypeCount > 1) return 'Mixed';
    if (hasRecurring) return 'Recurrent';
    if (hasTimeBased) return 'Time-Based';
    return 'One-Time';
  };

  // Fetch deal_talent for table (Talent column + sticky button avatars)
  const { data: dealTalentData } = await supabase
    .from('deal_talent')
    .select('deal_id, talent_id, talent(id, first_name, last_name, avatar_url)')
    .in('deal_id', dealIds);

  const talentByDealId = new Map<string, { id: string; name: string; avatar_url?: string }[]>();
  (dealTalentData || []).forEach((dt: any) => {
    const t = Array.isArray(dt.talent) ? dt.talent[0] : dt.talent;
    const name = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : '';
    const list = talentByDealId.get(dt.deal_id) || [];
    list.push({ id: t?.id ?? dt.talent_id, name: name || '—', avatar_url: t?.avatar_url });
    talentByDealId.set(dt.deal_id, list);
  });

  // Fetch deal_contacts for Contacts column (people linked per deal; people table uses photo_url for profile image)
  const { data: dealContactsData } = await supabase
    .from('deal_contacts')
    .select('deal_id, person_id, people(id, first_name, last_name, photo_url)')
    .in('deal_id', dealIds);

  const contactsByDealId = new Map<string, { id: string; name: string; first_name?: string; avatar_url?: string }[]>();
  (dealContactsData || []).forEach((dc: any) => {
    const p = Array.isArray(dc.people) ? dc.people[0] : dc.people;
    const firstName = p?.first_name?.trim() ?? '';
    const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : '';
    const list = contactsByDealId.get(dc.deal_id) || [];
    list.push({ id: p?.id ?? dc.person_id, name: name || '—', first_name: firstName || undefined, avatar_url: p?.photo_url ?? p?.avatar_url });
    contactsByDealId.set(dc.deal_id, list);
  });

  // Transform to Deal format
  const dealsData: Deal[] = (dealsDataRaw || []).map((deal: any) => {
    const stage = Array.isArray(deal.deal_stages) ? deal.deal_stages[0] : deal.deal_stages;
    const owner = Array.isArray(deal.users) ? deal.users[0] : deal.users;
    const ownerName = owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() : 'Unknown';
    const company = companyByDealId.get(deal.id);
    const amount = amountByDealId.get(deal.id) ?? 0;
    const recurrence = getRecurrenceLabel(deal.id);
    const talentList = talentByDealId.get(deal.id) || [];
    const contactsList = contactsByDealId.get(deal.id) || [];
    const hasRecurringNoCount = recurringNoCountIntervalByDealId.has(deal.id);
    const hasRecurringWithCount = dealHasRecurringWithCount.has(deal.id);
    const valueLabel =
      hasRecurringNoCount && !hasRecurringWithCount
        ? billingIntervalToValueLabel(recurringNoCountIntervalByDealId.get(deal.id))
        : undefined;
    const mrrAmount = mrrAmountByDealId.get(deal.id) ?? 0;
    const valueAmount = valueAmountByDealId.get(deal.id) ?? 0;
    const hasBothMrrAndValue = mrrAmount > 0 && valueAmount > 0;

    return {
      id: deal.id,
      dealName: deal.deal_name || 'Unnamed Deal',
      company: company?.name || '',
      companyId: company?.id || undefined,
      dealOwner: ownerName,
      dealOwnerProfilePicture: owner?.avatar_url || '',
      creator: ownerName,
      creatorProfilePicture: owner?.avatar_url || '',
      amount,
      amountDisplay: buildAmountDisplay(deal.id),
      valueLabel: hasBothMrrAndValue ? undefined : valueLabel,
      mrrAmount: hasBothMrrAndValue ? mrrAmount : undefined,
      valueAmount: hasBothMrrAndValue ? valueAmount : undefined,
      recurrence,
      submissionDueDate: '',
      conceptSubmissionDate: '',
      payoutDate: '',
      companyWebsite: company?.website || '',
      companyLogo: company?.logo_url || '',
      createdAt: deal.created_at,
      stage: stage?.name || '',
      stageData: stage ? { is_won: stage.is_won || false, is_lost: stage.is_lost || false, index_order: stage.order_index ?? null } : undefined,
      pipeline: deal.deal_type || '',
      deliverables: [],
      talent: talentList.length > 0 ? talentList : undefined,
      contacts: contactsList.length > 0 ? contactsList : undefined,
      dealStageId: deal.deal_stage_id ?? undefined,
    };
  });

  return dealsData;
}
