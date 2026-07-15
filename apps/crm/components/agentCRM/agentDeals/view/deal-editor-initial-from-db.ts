import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { emptyVendorInfo } from "../tabs/invoiceTab/invoice-vendor-shared";

/** Row shape consumed by parseDeliverables in view-agent-deals (deal_deliverables fields). */
type DealDeliverableRow = {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price_cents: number;
  currency?: string | null;
  billing_type?: string | null;
  billing_interval?: string | null;
  starts_at?: string | null;
  recurrence_count?: number | null;
  net_payout?: number | null;
  details?: Record<string, unknown> | null;
};

/**
 * Loads a CRM deal graph from Postgres for the edit sheet (mirrors refreshDealData in view-agent-deals).
 */
export async function fetchDealEditorInitialData(dealId: string) {
  const supabase = getSupabaseClient();
  const { data: deal, error } = await supabase
    .from("deals")
    .select(
      `
            id,
            deal_name,
            source,
            deal_type,
            deal_stage_id,
            deal_owner,
            vendor_company_id,
            deal_stages (id, name, slug, order_index, probability, is_won, is_lost),
            users!deals_deal_owner_fkey (id, first_name, last_name, avatar_url)
          `
    )
    .eq("id", dealId)
    .single();

  if (error || !deal) {
    console.error("Error loading deal for editor:", error);
    return null;
  }

  const [
    companiesRes,
    contactsRes,
    deliverablesRes,
    eventsRes,
    documentsRes,
    dealTalentRes,
    commissionsRes,
  ] = await Promise.all([
    supabase
      .from("deal_companies")
      .select("id, company_id, role, companies(id, name, website, logo_url)")
      .eq("deal_id", dealId),
    supabase
      .from("deal_contacts")
      .select("id, person_id, deal_company_id, role, people(id, first_name, last_name, email, photo_url)")
      .eq("deal_id", dealId),
    supabase.from("deal_deliverables").select("*").eq("deal_id", dealId),
    supabase.from("deal_events").select("*").eq("deal_id", dealId).order("due_at", { ascending: true }),
    supabase
      .from("deal_documents")
      .select("id, file_name, file_url, mime_type, document_type, name")
      .eq("deal_id", dealId)
      .eq("is_archived", false),
    supabase.from("deal_talent").select("id, talent_id, role, revenue_share_bps, talent(id, first_name, last_name, avatar_url, country, user_id, users(tax_region))").eq("deal_id", dealId),
    supabase
      .from("deal_commissions")
      .select("id, user_id, commission_bps, role, users(id, first_name, last_name, email, avatar_url)")
      .eq("deal_id", dealId),
  ]);

  const companiesList = (companiesRes.data || []).map((dc: any) => {
    const c = dc.companies ? (Array.isArray(dc.companies) ? dc.companies[0] : dc.companies) : null;
    return {
      id: dc.id,
      company_id: dc.company_id,
      company_name: c?.name ?? "",
      role: dc.role ?? "client",
      logo_url: c?.logo_url ?? null,
    };
  });
  const companyRow = (companiesRes.data || []).find((dc: any) => dc.role === "client") || companiesRes.data?.[0];
  const company = companyRow?.companies
    ? Array.isArray(companyRow.companies)
      ? companyRow.companies[0]
      : companyRow.companies
    : null;
  const stage = Array.isArray((deal as any).deal_stages) ? (deal as any).deal_stages[0] : (deal as any).deal_stages;
  const owner = Array.isArray((deal as any).users) ? (deal as any).users[0] : (deal as any).users;

  const dealTalentList = (dealTalentRes.data || []).map((dt: any) => {
    const t = Array.isArray(dt.talent) ? dt.talent[0] : dt.talent;
    const u = t?.users ? (Array.isArray(t.users) ? t.users[0] : t.users) : null;
    const name = t ? `${t.first_name || ""} ${t.last_name || ""}`.trim() : "";
    return {
      id: dt.id,
      talent_id: dt.talent_id,
      talent_name: name,
      avatar_url: t?.avatar_url || undefined,
      role: dt.role ?? null,
      revenue_share_bps: dt.revenue_share_bps ?? null,
      talent_country: t?.country ?? null,
      talent_tax_region: u?.tax_region ?? null,
    };
  });
  const firstTalent = dealTalentList[0];
  const creatorFromTalent = firstTalent?.talent_name || "";
  const creatorPictureFromTalent = firstTalent?.avatar_url || "";

  const dealCommissionsList = (commissionsRes.data || []).map((dc: any) => {
    const u = Array.isArray(dc.users) ? dc.users[0] : dc.users;
    return {
      id: dc.id,
      user_id: dc.user_id,
      first_name: u?.first_name ?? "",
      last_name: u?.last_name ?? "",
      email: u?.email ?? null,
      avatar_url: u?.avatar_url ?? null,
      commission_bps: dc.commission_bps ?? 0,
      role: dc.role ?? null,
    };
  });

  const eventsList = (eventsRes.data || []).map((e: any) => ({
    id: e.id,
    name: e.name || "",
    description: e.description ?? null,
    event_type: e.event_type || "custom",
    due_at: e.due_at || "",
    related_deliverable_id: e.related_deliverable_id ?? null,
  }));
  const conceptSubmissionDate =
    eventsList.find((e) => e.event_type === "proposal_due")?.due_at || "";
  const submissionDueDate =
    eventsList.find((e) => e.event_type === "deliverable_due")?.due_at || "";
  const liveDueDate =
    eventsList.find((e) => e.event_type === "go_live_date")?.due_at || "";
  const payoutDate =
    eventsList.find((e) => e.event_type === "net_payout_start")?.due_at || "";

  const deliverablesList = (deliverablesRes.data || []).map((d: DealDeliverableRow) => ({
    id: d.id,
    name: d.name || "",
    description: d.description ?? null,
    quantity: Number(d.quantity) || 1,
    unit_price_cents: Number(d.unit_price_cents) || 0,
    currency: d.currency || "USD",
    billing_type:
      d.billing_type === "recurring"
        ? "recurring"
        : d.billing_type === "time_based"
          ? "time_based"
          : "one_off",
    billing_interval: d.billing_type === "recurring" ? d.billing_interval ?? "monthly" : null,
    starts_at: d.starts_at ?? null,
    recurrence_count: d.recurrence_count ?? null,
    net_payout: d.net_payout ?? null,
    detailsEntries: d.details
      ? (Object.entries(d.details as Record<string, unknown>).map(([k, v]) => [
          k,
          String(v ?? ""),
        ]) as [string, string][])
      : [],
  }));

  const _dealDeliverables = (deliverablesRes.data || []).map((d: any) => ({ id: d.id, name: d.name || "" }));
  const amount = (deliverablesRes.data || []).reduce(
    (sum: number, d: any) =>
      sum + (Number(d.quantity) || 0) * (Number(d.unit_price_cents) || 0) / 100,
    0
  );

  const dealContactsList = (contactsRes.data || []).map((dc: any) => {
    const p = Array.isArray(dc.people) ? dc.people[0] : dc.people;
    return {
      id: dc.id,
      person_id: dc.person_id,
      first_name: p?.first_name ?? "",
      last_name: p?.last_name ?? "",
      email: p?.email ?? null,
      role: dc.role ?? null,
      photo_url: p?.photo_url ?? null,
    };
  });
  const firstContact = dealContactsList[0];
  const pointOfContact = firstContact
    ? `${firstContact.first_name || ""} ${firstContact.last_name || ""}`.trim()
    : "";

  const allDocs = (documentsRes.data || []) as {
    id: string;
    file_name: string;
    file_url: string;
    mime_type?: string;
    document_type?: string;
    name?: string | null;
  }[];
  const contractDoc = allDocs.find((d) => d.document_type === "contract");
  const contractFileUrl = contractDoc?.file_url || "";
  const contractFileName = contractDoc?.file_name || "";
  const dealDocumentsList = allDocs.map((d) => ({
    id: d.id,
    file_name: d.file_name,
    file_url: d.file_url,
    mime_type: d.mime_type || "application/octet-stream",
    document_type: d.document_type || "document",
    name: d.name || null,
  }));

  const stageOrder = stage?.order_index ?? null;
  let nextStep = "";
  if (stageOrder !== null) {
    const { data: allStages } = await supabase
      .from("deal_stages")
      .select("id, name, order_index, is_won, is_lost")
      .order("order_index", { ascending: true });
    const list = (allStages || []) as {
      order_index?: number;
      name: string;
      is_won?: boolean;
      is_lost?: boolean;
    }[];
    const next = list.find(
      (s) => (s.order_index ?? 999) > stageOrder && !s.is_won && !s.is_lost
    );
    const stageAny = stage as { is_won?: boolean; is_lost?: boolean } | null;
    nextStep = next ? next.name : stageAny?.is_won || stageAny?.is_lost ? "Complete" : "";
  }

  const vendorCompanyIdRefresh = (deal as any).vendor_company_id as string | null | undefined;
  let invoiceVendorInfoRefresh = { ...emptyVendorInfo };
  let invoiceVendorInfoIdRefresh: string | null = null;
  if (vendorCompanyIdRefresh) {
    const { data: vinf } = await supabase
      .from("companies_vendor_information")
      .select("id, legal_name, city, state, country, address, post_code, vendor_email")
      .eq("company_id", vendorCompanyIdRefresh)
      .maybeSingle();
    if (vinf) {
      invoiceVendorInfoIdRefresh = vinf.id;
      invoiceVendorInfoRefresh = {
        legal_name: vinf.legal_name ?? "",
        city: vinf.city ?? "",
        state: vinf.state ?? "",
        country: vinf.country ?? "",
        address: vinf.address ?? "",
        post_code: vinf.post_code ?? "",
        vendor_email: vinf.vendor_email ?? "",
      };
    }
  }

  return {
    creator: creatorFromTalent || (owner ? `${owner.first_name || ""} ${owner.last_name || ""}`.trim() : ""),
    company: company?.name || "",
    dealName: (deal as any).deal_name || "",
    amount: amount.toString(),
    payoutNet: "",
    leadSource: (deal as any).source || "",
    deliverables: deliverablesList,
    events: eventsList,
    dealTalent: dealTalentList,
    _dealDeliverables,
    submissionDueDate,
    liveDueDate,
    stage: stage?.name || "",
    pointOfContact,
    dealContacts: dealContactsList,
    ideationDueDate: "",
    split: "",
    dealOwner: (deal as any).deal_owner || "",
    dealOwnerName: owner ? `${owner.first_name || ""} ${owner.last_name || ""}`.trim() : "",
    dealOwnerAvatar: owner?.avatar_url || "",
    expectedNet: "",
    nextStep,
    expectedRevenue: "",
    payoutDate,
    probability: stage?.probability?.toString() || "",
    conceptSubmissionDate,
    pipeline: (deal as any).deal_type || "",
    companyWebsite: company?.website || "",
    creatorProfilePicture: creatorPictureFromTalent || owner?.avatar_url || "",
    contractFileName,
    contractFileUrl,
    contractFile: null as File | null,
    dealDocuments: dealDocumentsList,
    _dealId: (deal as any).id,
    dealId: (deal as any).id,
    dealCompanies: companiesList,
    dealCommissions: dealCommissionsList,
    _companyId: company?.id || (companyRow as any)?.company_id || null,
    _dealCompanyId: (companyRow as any)?.id || null,
    _dealStageId: (deal as any).deal_stage_id,
    _stageId: (deal as any).deal_stage_id,
    _partnershipStageId: (deal as any).deal_stage_id,
    _contractId: contractDoc?.id || null,
    _stageIndexOrder: stageOrder,
    invoiceVendorCompanyId: vendorCompanyIdRefresh ?? null,
    invoiceVendorInfo: invoiceVendorInfoRefresh,
    invoiceVendorInfoId: invoiceVendorInfoIdRefresh,
  };
}
