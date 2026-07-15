"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import type { InvoicePreviewHandle } from "./invoice-preview";
import {
  addDays,
  applyRecommendedTaxToLineItems,
  deliverablesToLineItemsWithRecommendedTax,
  deriveInvoiceDates,
  diffNetTermDays,
  fetchInvoiceWiseLinkCounts,
  fetchInvoicePaymentsForInvoice,
  lineItemTotalCents,
  lineItemTotalWithTaxCents,
  mapDbLineToForm,
} from "./invoice-helpers";
import { persistInvoiceFromFormData } from "./persist-invoice-from-form";
import type { InvoiceLineItemForm, InvoicePaymentForm, VendorInformationRow } from "./invoice-types";
import { emptyVendorInfo, isVendorInfoComplete } from "./invoice-vendor-shared";
import { TAX_DROPDOWN_OPTIONS } from "./canadian-tax-options";
import { recommendInvoiceTax } from "@/lib/invoice/recommend-invoice-tax";
import {
  InvoiceDetailsCard,
  type InvoiceDetailsPanelMode,
  type InvoiceSummary,
} from "./invoice-details-card";
import { VendorDetailsCard } from "./vendor-details-card";
import { GenerateInvoiceDialog, type GenerateInvoiceDialogVariant } from "./generate-invoice-dialog";

export { emptyVendorInfo, isVendorInfoComplete } from "./invoice-vendor-shared";
export type { InvoiceLineItemForm, InvoicePaymentForm } from "./invoice-types";
interface InvoicingProps {
  formData: {
    dealCompanies?: { company_id: string; company_name: string; role?: string; logo_url?: string | null }[];
    invoiceVendorCompanyId?: string | null;
    invoiceVendorInfo?: typeof emptyVendorInfo;
    invoiceVendorInfoId?: string | null;
    [key: string]: any;
  };
  setFormData: (arg: any) => void;
  dealId?: string | null;
  /**
   * Parent syncs invoice slice of last-saved snapshot (`savedDataRef`) so DB-backed loads and persists
   * do not flip the deal Save button until the user actually edits invoice fields.
   */
  onInvoiceDraftSynced?: (payload: {
    _invoiceId: string | undefined;
    invoiceDetails: Record<string, unknown>;
    invoiceLineItems: InvoiceLineItemForm[];
    invoicePayments: InvoicePaymentForm[];
  }) => void;
  /** `public.users.is_admin` — Wise payment UI, `invoice_payments` sync, and Send invoice. */
  canManageInvoiceWisePayments?: boolean;
}

type InvoiceRowForSort = { due_date?: string | null; created_at?: string | null };

function parseSortableTime(v: string | null | undefined): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Date.parse(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Invoice dropdown: latest due date first; missing due last; ties by newer `created_at`. */
function sortInvoiceRowsByDueDateDesc<T extends InvoiceRowForSort>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = parseSortableTime(a.due_date);
    const db = parseSortableTime(b.due_date);
    if (da != null && db != null && da !== db) return db - da;
    if (da != null && db == null) return -1;
    if (da == null && db != null) return 1;
    const ca = parseSortableTime(a.created_at) ?? 0;
    const cb = parseSortableTime(b.created_at) ?? 0;
    return cb - ca;
  });
}

function pickNewestCreatedInvoice<T extends { created_at?: string | null }>(rows: T[]): T | null {
  if (!rows.length) return null;
  return rows.reduce((best, r) => {
    const tb = parseSortableTime(best.created_at) ?? -Infinity;
    const tr = parseSortableTime(r.created_at) ?? -Infinity;
    return tr >= tb ? r : best;
  });
}

function calculateDueDateFromIssueDate(issueDateIso: string, netTermDays: number): string {
  const parsedIssue = new Date(`${issueDateIso}T00:00:00`);
  if (Number.isNaN(parsedIssue.getTime())) return issueDateIso;
  const safeNetDays = Math.max(0, Math.floor(Number(netTermDays) || 0));
  return addDays(parsedIssue, safeNetDays).toISOString().split("T")[0];
}

type InvoiceRowForSummary = {
  id: string;
  invoice_number?: string | null;
  public_token?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  total_amount_cents?: number | null;
  currency?: string | null;
  created_at?: string | null;
};

async function buildInvoiceSummaries(
  supabase: ReturnType<typeof getSupabaseClient>,
  rows: InvoiceRowForSummary[]
): Promise<InvoiceSummary[]> {
  const sorted = sortInvoiceRowsByDueDateDesc(rows);
  let linkCounts = new Map<string, number>();
  if (sorted.length) {
    try {
      linkCounts = await fetchInvoiceWiseLinkCounts(
        supabase,
        sorted.map((r) => r.id)
      );
    } catch (e) {
      console.error("[buildInvoiceSummaries]", e);
      linkCounts = new Map();
    }
  }
  return sorted.map((r) => ({
    id: r.id,
    invoice_number: r.invoice_number ?? "",
    public_token: r.public_token ?? null,
    issue_date: r.issue_date ?? null,
    due_date: r.due_date ?? null,
    status: r.status ?? null,
    total_amount_cents: r.total_amount_cents != null ? Number(r.total_amount_cents) : null,
    currency: r.currency ?? null,
    linked_wise_transaction_count: linkCounts.get(r.id) ?? 0,
  }));
}

export default function Invoicing({
  formData,
  setFormData,
  dealId,
  onInvoiceDraftSynced,
  canManageInvoiceWisePayments = false,
}: InvoicingProps) {
  const normalizeCurrencyCode = useCallback((value: unknown): string => {
    const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
    return raw || "USD";
  }, []);

  const dealCompanies = formData.dealCompanies ?? [];
  const selectedCompanyId = formData.invoiceVendorCompanyId ?? null;
  const vendorInfo = formData.invoiceVendorInfo ?? emptyVendorInfo;
  const dealTalent = formData.dealTalent ?? [];
  const primaryDealTalent = dealTalent[0];

  const taxRecommendation = useMemo(
    () =>
      recommendInvoiceTax({
        vendorCountry: vendorInfo.country,
        vendorState: vendorInfo.state,
        talentCountry: primaryDealTalent?.talent_country ?? null,
        talentTaxRegion: primaryDealTalent?.talent_tax_region ?? null,
      }),
    [
      vendorInfo.country,
      vendorInfo.state,
      primaryDealTalent?.talent_country,
      primaryDealTalent?.talent_tax_region,
    ]
  );

  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const onInvoiceDraftSyncedRef = useRef(onInvoiceDraftSynced);
  onInvoiceDraftSyncedRef.current = onInvoiceDraftSynced;

  const notifyInvoiceDraftSynced = useCallback((payload: Parameters<NonNullable<InvoicingProps["onInvoiceDraftSynced"]>>[0]) => {
    onInvoiceDraftSyncedRef.current?.(payload);
  }, []);

  const [loadingVendor, setLoadingVendor] = useState(false);
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  const [invoiceDetailsPanelMode, setInvoiceDetailsPanelMode] =
    useState<InvoiceDetailsPanelMode>("hidden");
  const invoiceDetailsPanelModeRef = useRef<InvoiceDetailsPanelMode>("hidden");
  useEffect(() => {
    invoiceDetailsPanelModeRef.current = invoiceDetailsPanelMode;
  }, [invoiceDetailsPanelMode]);

  const [generateInvoiceDialogOpen, setGenerateInvoiceDialogOpen] = useState(false);
  const [generateInvoiceDialogVariant, setGenerateInvoiceDialogVariant] =
    useState<GenerateInvoiceDialogVariant>("first");
  const invoiceDialogIntentRef = useRef<"hydrate" | "createNew">("hydrate");
  const [invoiceSyncLoading, setInvoiceSyncLoading] = useState(false);
  const invoiceSyncInFlightRef = useRef(false);
  const invoicePreviewRef = useRef<InvoicePreviewHandle>(null);
  const [invoiceSummaries, setInvoiceSummaries] = useState<InvoiceSummary[]>([]);

  const calculatedTotalCents = useMemo(
    () =>
      (formData.deliverables ?? []).reduce((sum: number, item: any) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price_cents) || 0;
        return sum + qty * unit;
      }, 0),
    [formData.deliverables]
  );

  const lineItemsTotalCents = useMemo(() => {
    const rows = formData.invoiceLineItems ?? [];
    return rows.reduce(
      (sum: number, row: InvoiceLineItemForm) => sum + lineItemTotalWithTaxCents(row),
      0
    );
  }, [formData.invoiceLineItems]);
  const displayTotalCents =
    (formData.invoiceLineItems?.length ?? 0) > 0 ? lineItemsTotalCents : calculatedTotalCents;

  const todayIso = new Date().toISOString().split("T")[0];
  const dueIso = addDays(new Date(), 30).toISOString().split("T")[0];
  const invoiceDetails = {
    invoice_number: formData.invoiceDetails?.invoice_number ?? "",
    issue_date: formData.invoiceDetails?.issue_date ?? todayIso,
    due_date: formData.invoiceDetails?.due_date ?? dueIso,
    status: formData.invoiceDetails?.status ?? "draft",
    net_term: Number(formData.invoiceDetails?.net_term ?? 30),
    currency: formData.invoiceDetails?.currency ?? "USD",
    total_amount_cents: Number(formData.invoiceDetails?.total_amount_cents ?? calculatedTotalCents),
  };

  useEffect(() => {
    if (!selectedCompanyId) {
      setFormData((prev: any) => ({
        ...prev,
        invoiceVendorInfo: emptyVendorInfo,
        invoiceVendorInfoId: null,
      }));
      return;
    }
    let cancelled = false;
    setLoadingVendor(true);
    const supabase = getSupabaseClient();
    supabase
      .from("companies_vendor_information")
      .select("id, company_id, legal_name, city, state, country, address, post_code, vendor_email")
      .eq("company_id", selectedCompanyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoadingVendor(false);
        if (error) {
          setFormData((prev: any) => ({
            ...prev,
            invoiceVendorInfo: emptyVendorInfo,
            invoiceVendorInfoId: null,
          }));
          return;
        }
        const row = data as VendorInformationRow | null;
        if (row) {
          setFormData((prev: any) => ({
            ...prev,
            invoiceVendorInfo: {
              legal_name: row.legal_name ?? "",
              city: row.city ?? "",
              state: row.state ?? "",
              country: row.country ?? "",
              address: row.address ?? "",
              post_code: row.post_code ?? "",
              vendor_email: row.vendor_email ?? "",
            },
            invoiceVendorInfoId: row.id,
          }));
        } else {
          setFormData((prev: any) => ({
            ...prev,
            invoiceVendorInfo: emptyVendorInfo,
            invoiceVendorInfoId: null,
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    setFormData((prev: any) => {
      const dels = prev.deliverables ?? [];
      const invoiceCurrency = normalizeCurrencyCode(prev.invoiceDetails?.currency ?? "USD");
      const current = prev.invoiceLineItems;
      const recommendation = recommendInvoiceTax({
        vendorCountry: prev.invoiceVendorInfo?.country,
        vendorState: prev.invoiceVendorInfo?.state,
        talentCountry: prev.dealTalent?.[0]?.talent_country ?? null,
        talentTaxRegion: prev.dealTalent?.[0]?.talent_tax_region ?? null,
      });

      if (current === undefined) {
        const rows = dels.length
          ? deliverablesToLineItemsWithRecommendedTax(dels, invoiceCurrency, recommendation)
          : [];
        return { ...prev, invoiceLineItems: rows };
      }
      if (Array.isArray(current) && current.length === 0 && dels.length > 0) {
        return {
          ...prev,
          invoiceLineItems: deliverablesToLineItemsWithRecommendedTax(
            dels,
            invoiceCurrency,
            recommendation
          ),
        };
      }
      return prev;
    });
  }, [selectedCompanyId, formData.deliverables, normalizeCurrencyCode]);

  useEffect(() => {
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
    if (!effectiveDealId || !selectedCompanyId) {
      setInvoiceSummaries([]);
      return;
    }
    let cancelled = false;

    (async () => {
      if (invoiceSyncInFlightRef.current) return;
      const supabase = getSupabaseClient();
      const { data: rows, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, public_token, issue_date, due_date, status, total_amount_cents, currency, created_at")
        .eq("deal_id", effectiveDealId)
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: true });

      if (cancelled || error) return;

      const list = rows ?? [];
      const summaries = await buildInvoiceSummaries(supabase, list as InvoiceRowForSummary[]);
      if (cancelled) return;
      setInvoiceSummaries(summaries);

      if (!list.length) return;

      const preferred = formDataRef.current._invoiceId as string | undefined;
      const targetRow =
        list.find((r: { id: string }) => r.id === preferred) ?? pickNewestCreatedInvoice(list);
      if (!targetRow?.id) return;

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", targetRow.id)
        .maybeSingle();

      if (cancelled || invErr || !inv) return;

      const { data: liRows, error: liErr } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("created_at", { ascending: true });

      if (cancelled || liErr) return;

      if (invoiceDetailsPanelModeRef.current === "details") return;

      const prev = formDataRef.current;
      if (prev._invoiceId === inv.id && (prev.invoiceDetails?.invoice_number || "").trim()) {
        return;
      }

      const invoiceDetails = {
        ...(prev.invoiceDetails ?? {}),
        invoice_number: inv.invoice_number ?? "",
        issue_date: inv.issue_date ?? prev.invoiceDetails?.issue_date,
        due_date: inv.due_date ?? prev.invoiceDetails?.due_date,
        status: inv.status ?? prev.invoiceDetails?.status ?? "draft",
        net_term: Number(inv.net_term ?? prev.invoiceDetails?.net_term ?? 30),
        currency: inv.currency ?? prev.invoiceDetails?.currency ?? "USD",
        total_amount_cents: Number(inv.total_amount_cents ?? prev.invoiceDetails?.total_amount_cents ?? 0),
        company_id: inv.company_id ?? selectedCompanyId,
      };
      const invoiceLineItems = (liRows ?? []).map(mapDbLineToForm);

      let invoicePayments: InvoicePaymentForm[] = [];
      try {
        invoicePayments = await fetchInvoicePaymentsForInvoice(supabase, inv.id);
      } catch {
        invoicePayments = [];
      }

      if (cancelled) return;

      setFormData((p: any) => ({
        ...p,
        _invoiceId: inv.id,
        invoiceDetails,
        invoiceLineItems,
        invoicePayments,
      }));
      notifyInvoiceDraftSynced({
        _invoiceId: inv.id,
        invoiceDetails,
        invoiceLineItems,
        invoicePayments,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [dealId, selectedCompanyId, notifyInvoiceDraftSynced]);

  const handleSelectVendor = (companyId: string) => {
    const value = companyId === "__none__" ? null : companyId;
    setFormData((prev: any) => ({
      ...prev,
      invoiceVendorCompanyId: value,
      _invoiceId: null,
      invoiceDetails: {},
      invoiceLineItems: undefined,
      invoicePayments: [],
    }));
    notifyInvoiceDraftSynced({
      _invoiceId: undefined,
      invoiceDetails: {},
      invoiceLineItems: [],
      invoicePayments: [],
    });
  };

  const showVendorInvoiceWarning = useMemo(() => {
    if (dealCompanies.length === 0) return false;
    if (!selectedCompanyId) return true;
    if (loadingVendor) return false;
    return !isVendorInfoComplete(vendorInfo);
  }, [dealCompanies.length, selectedCompanyId, loadingVendor, vendorInfo]);

  const vendorInvoiceWarningTooltip = !selectedCompanyId
    ? "Select a vendor company, then add full vendor details to generate an invoice."
    : "Please add all vendor details (legal name, email, and full address) to generate an invoice.";

  const updateField = (field: keyof typeof emptyVendorInfo, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      invoiceVendorInfo: { ...(prev.invoiceVendorInfo ?? emptyVendorInfo), [field]: value },
    }));
  };

  const updateInvoiceField = (field: string, value: string | number) => {
    setFormData((prev: any) => {
      const baseInvoiceDetails = {
        invoice_number: "",
        issue_date: todayIso,
        due_date: dueIso,
        status: "draft",
        net_term: 30,
        currency: "USD",
        total_amount_cents: calculatedTotalCents,
        ...(prev.invoiceDetails ?? {}),
      };
      const nextInvoiceDetails = {
        ...baseInvoiceDetails,
        [field]: value,
        company_id:
          (prev.invoiceDetails as { company_id?: string } | undefined)?.company_id ??
          prev.invoiceVendorCompanyId ??
          null,
      };
      if (field === "issue_date" || field === "net_term") {
        const issueDateIso = String(nextInvoiceDetails.issue_date ?? "").trim();
        const netTermDays = Number(nextInvoiceDetails.net_term ?? 0);
        if (issueDateIso) {
          nextInvoiceDetails.due_date = calculateDueDateFromIssueDate(issueDateIso, netTermDays);
        }
      }
      return {
        ...prev,
        invoiceDetails: nextInvoiceDetails,
      };
    });
  };

  const applyAutoSentInvoiceStatus = useCallback(() => {
    let syncedPayload:
      | {
          _invoiceId: string | undefined;
          invoiceDetails: Record<string, unknown>;
          invoiceLineItems: InvoiceLineItemForm[];
          invoicePayments: InvoicePaymentForm[];
        }
      | null = null;

    setFormData((prev: any) => {
      const nextInvoiceDetails: Record<string, unknown> = {
        invoice_number: "",
        issue_date: todayIso,
        due_date: dueIso,
        net_term: 30,
        currency: "USD",
        total_amount_cents: calculatedTotalCents,
        ...(prev.invoiceDetails ?? {}),
      };
      nextInvoiceDetails.status = "sent";
      nextInvoiceDetails.company_id =
        (prev.invoiceDetails as { company_id?: string } | undefined)?.company_id ??
        prev.invoiceVendorCompanyId ??
        null;

      syncedPayload = {
        _invoiceId: prev._invoiceId as string | undefined,
        invoiceDetails: nextInvoiceDetails,
        invoiceLineItems: (prev.invoiceLineItems ?? []) as InvoiceLineItemForm[],
        invoicePayments: (prev.invoicePayments ?? []) as InvoicePaymentForm[],
      };

      return {
        ...prev,
        invoiceDetails: nextInvoiceDetails,
      };
    });

    if (syncedPayload) {
      notifyInvoiceDraftSynced(syncedPayload);
    }
  }, [calculatedTotalCents, dueIso, notifyInvoiceDraftSynced, setFormData, todayIso]);

  const updateLineItem = (index: number, patch: Partial<InvoiceLineItemForm>) => {
    setFormData((prev: any) => {
      const rows = [...(prev.invoiceLineItems ?? [])] as InvoiceLineItemForm[];
      const cur = { ...rows[index], ...patch };
      if ("quantity" in patch || "unit_price_cents" in patch) {
        cur.total_cents = lineItemTotalCents(cur.quantity, cur.unit_price_cents);
      }
      rows[index] = cur;
      return { ...prev, invoiceLineItems: rows };
    });
  };

  const addLineItem = () => {
    setFormData((prev: any) => {
      const newRow: InvoiceLineItemForm = {
        deal_deliverable_id: null,
        title: "",
        description: "",
        quantity: 1,
        unit_price_cents: 0,
        total_cents: 0,
        tax_status: "out_of_scope",
        tax_rate_bps: 0,
        tax_name: null,
      };
      const recommendation = recommendInvoiceTax({
        vendorCountry: prev.invoiceVendorInfo?.country,
        vendorState: prev.invoiceVendorInfo?.state,
        talentCountry: prev.dealTalent?.[0]?.talent_country ?? null,
        talentTaxRegion: prev.dealTalent?.[0]?.talent_tax_region ?? null,
      });
      const [taxedRow] = applyRecommendedTaxToLineItems([newRow], recommendation);
      return {
        ...prev,
        invoiceLineItems: [...(prev.invoiceLineItems ?? []), taxedRow],
      };
    });
  };

  const removeLineItem = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      invoiceLineItems: (prev.invoiceLineItems ?? []).filter((_: unknown, i: number) => i !== index),
    }));
  };

  const addInvoicePayment = useCallback(() => {
    setFormData((prev: any) => ({
      ...prev,
      invoicePayments: [...(prev.invoicePayments ?? []), { transaction_id: "" }],
    }));
  }, []);

  const updateInvoicePayment = useCallback((index: number, patch: Partial<InvoicePaymentForm>) => {
    setFormData((prev: any) => {
      const rows = [...(prev.invoicePayments ?? [])] as InvoicePaymentForm[];
      if (!rows[index]) return prev;
      rows[index] = { ...rows[index], ...patch };
      return { ...prev, invoicePayments: rows };
    });
  }, []);

  const removeInvoicePayment = useCallback((index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      invoicePayments: (prev.invoicePayments ?? []).filter((_: unknown, i: number) => i !== index),
    }));
  }, []);

  const applyTaxToAllLineItems = useCallback((value: string) => {
    const selected = TAX_DROPDOWN_OPTIONS.find((opt) => opt.value === value);
    if (!selected) return;
    setFormData((prev: any) => {
      const rows = [...(prev.invoiceLineItems ?? [])] as InvoiceLineItemForm[];
      if (rows.length === 0) return prev;
      return {
        ...prev,
        invoiceLineItems: rows.map((row) => ({
          ...row,
          tax_status: selected.taxStatus,
          tax_rate_bps: selected.taxRateBps,
          tax_name: selected.taxName,
        })),
      };
    });
  }, [setFormData]);

  const applyDeliverableToLine = (index: number, deliverableId: string) => {
    if (deliverableId === "__none__") {
      updateLineItem(index, { deal_deliverable_id: null });
      return;
    }
    const d = (formData.deliverables ?? []).find((x: any) => x.id === deliverableId);
    if (!d) return;
    const invoiceCurrency = normalizeCurrencyCode(invoiceDetails.currency);
    const deliverableCurrency = normalizeCurrencyCode(d.currency);
    if (deliverableCurrency !== invoiceCurrency) {
      wallsToast.error("Currency mismatch", `This deliverable is ${deliverableCurrency}, but the invoice is ${invoiceCurrency}.`);
      return;
    }
    const qty = Number(d.quantity) || 1;
    const unit = Number(d.unit_price_cents) || 0;
    setFormData((prev: any) => {
      const rows = [...(prev.invoiceLineItems ?? [])] as InvoiceLineItemForm[];
      rows[index] = {
        ...rows[index],
        deal_deliverable_id: d.id ?? null,
        title: (d.name ?? "").trim() || rows[index]?.title || "Line item",
        description: d.description ?? "",
        quantity: qty,
        unit_price_cents: unit,
        total_cents: lineItemTotalCents(qty, unit),
      };
      return { ...prev, invoiceLineItems: rows };
    });
  };

  const deliverables = formData.deliverables ?? [];

  const refreshInvoiceSummariesFromDb = useCallback(async () => {
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
    if (!effectiveDealId || !selectedCompanyId) {
      setInvoiceSummaries([]);
      return;
    }
    const supabase = getSupabaseClient();
    const { data: rows } = await supabase
      .from("invoices")
      .select("id, invoice_number, public_token, issue_date, due_date, status, total_amount_cents, currency, created_at")
      .eq("deal_id", effectiveDealId)
      .eq("company_id", selectedCompanyId)
      .order("created_at", { ascending: true });
    const summaries = await buildInvoiceSummaries(supabase, (rows ?? []) as InvoiceRowForSummary[]);
    setInvoiceSummaries(summaries);
  }, [dealId, selectedCompanyId]);

  const loadInvoiceById = useCallback(
    async (invoiceId: string) => {
      const supabase = getSupabaseClient();
      const { data: inv, error: invErr } = await supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
      if (invErr || !inv) {
        wallsToast.error("Could not load invoice", invErr?.message ?? "Not found");
        return;
      }
      const { data: liRows, error: liErr } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });
      if (liErr) {
        wallsToast.error("Could not load line items", liErr.message);
        return;
      }
      const prev = formDataRef.current;
      const issue = prev.invoiceDetails?.issue_date ?? new Date().toISOString().split("T")[0];
      const due = prev.invoiceDetails?.due_date ?? addDays(new Date(), 30).toISOString().split("T")[0];
      const invoiceDetails = {
        invoice_number: inv.invoice_number ?? "",
        issue_date: inv.issue_date ?? issue,
        due_date: inv.due_date ?? due,
        status: inv.status ?? "draft",
        net_term: Number(inv.net_term ?? 30),
        currency: inv.currency ?? "USD",
        total_amount_cents: Number(inv.total_amount_cents ?? 0),
        company_id: inv.company_id ?? selectedCompanyId,
      };
      const invoiceLineItems = (liRows ?? []).map(mapDbLineToForm);
      let invoicePayments: InvoicePaymentForm[] = [];
      try {
        invoicePayments = await fetchInvoicePaymentsForInvoice(supabase, inv.id);
      } catch {
        invoicePayments = [];
      }
      setFormData((p: any) => ({
        ...p,
        _invoiceId: inv.id,
        invoiceDetails,
        invoiceLineItems,
        invoicePayments,
      }));
      notifyInvoiceDraftSynced({
        _invoiceId: inv.id,
        invoiceDetails,
        invoiceLineItems,
        invoicePayments,
      });
    },
    [selectedCompanyId, notifyInvoiceDraftSynced]
  );

  const handleInvoiceSwitch = async (nextId: string) => {
    if (!nextId || nextId === ((formDataRef.current as any)._invoiceId ?? "")) return;
    if (invoiceSyncInFlightRef.current) return;
    invoiceSyncInFlightRef.current = true;
    setInvoiceSyncLoading(true);
    try {
      await loadInvoiceById(nextId);
    } finally {
      invoiceSyncInFlightRef.current = false;
      setInvoiceSyncLoading(false);
    }
  };

  const handleDeleteCurrentInvoice = useCallback(async () => {
    const currentId = (formDataRef.current as any)._invoiceId as string | undefined;
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
    if (!currentId || !selectedCompanyId || !effectiveDealId) {
      wallsToast.error("Cannot delete invoice", "Select a saved invoice first.");
      return;
    }
    if (invoiceSyncInFlightRef.current) return;

    invoiceSyncInFlightRef.current = true;
    setInvoiceSyncLoading(true);
    const supabase = getSupabaseClient();
    try {
      const { error: delErr } = await supabase.from("invoices").delete().eq("id", currentId);
      if (delErr) {
        wallsToast.error("Could not delete invoice", delErr.message);
        return;
      }

      setInvoiceDetailsPanelMode("hidden");

      const { data: rows } = await supabase
        .from("invoices")
        .select("id, invoice_number, public_token, issue_date, due_date, status, total_amount_cents, currency, created_at")
        .eq("deal_id", effectiveDealId)
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: true });

      const list = (rows ?? []) as InvoiceRowForSummary[];
      const summaries = await buildInvoiceSummaries(supabase, list);
      setInvoiceSummaries(summaries);

      if (list.length > 0) {
        const next = pickNewestCreatedInvoice(list);
        if (next?.id) {
          await loadInvoiceById(next.id);
        }
      } else {
        setFormData((prev: any) => ({
          ...prev,
          _invoiceId: null,
          invoiceDetails: {},
          invoiceLineItems: [],
          invoicePayments: [],
        }));
        notifyInvoiceDraftSynced({
          _invoiceId: undefined,
          invoiceDetails: {},
          invoiceLineItems: [],
          invoicePayments: [],
        });
      }

      wallsToast.negative("Invoice deleted");
    } finally {
      invoiceSyncInFlightRef.current = false;
      setInvoiceSyncLoading(false);
    }
  }, [dealId, selectedCompanyId, loadInvoiceById, notifyInvoiceDraftSynced]);

  const persistInvoiceToDatabase = async () => {
    const id = (formDataRef.current as any)._invoiceId as string | undefined;
    const companyId = selectedCompanyId;
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
    if (!id || !companyId || !effectiveDealId) {
      wallsToast.error("Nothing to save", "Open invoice details and ensure an invoice is selected.");
      return;
    }
    if (invoiceSyncInFlightRef.current) return;
    invoiceSyncInFlightRef.current = true;
    setInvoiceSyncLoading(true);
    const supabase = getSupabaseClient();
    try {
      const prev = formDataRef.current as any;
      const result = await persistInvoiceFromFormData(supabase, prev, {}, {
        syncInvoicePayments: canManageInvoiceWisePayments,
      });
      if (result.ok === false) {
        wallsToast.error("Could not save invoice", result.message);
        return;
      }
      if (result.skipped === false) {
        setFormData((p: any) => ({
          ...p,
          invoiceLineItems: result.invoiceLineItems,
          invoiceDetails: {
            ...(p.invoiceDetails ?? {}),
            ...result.invoiceDetails,
          },
          invoicePayments: result.invoicePayments,
        }));
        notifyInvoiceDraftSynced({
          _invoiceId: id,
          invoiceDetails: result.invoiceDetails,
          invoiceLineItems: result.invoiceLineItems,
          invoicePayments: result.invoicePayments,
        });
      }
      await refreshInvoiceSummariesFromDb();
      wallsToast.success("Invoice saved", "Changes were written to the database.");
    } finally {
      invoiceSyncInFlightRef.current = false;
      setInvoiceSyncLoading(false);
    }
  };

  const createNewInvoiceWithSeed = useCallback(
    async (payload: {
      issueDateIso: string;
      dueDateIso: string;
      seedLineItems: InvoiceLineItemForm[];
      currencyIso?: string;
    }): Promise<boolean> => {
    const companyId = selectedCompanyId;
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
    if (!effectiveDealId || !companyId) {
      wallsToast.error("Cannot create invoice", "Save the deal first and select a vendor company.");
        return false;
    }
      if (invoiceSyncInFlightRef.current) return false;
    invoiceSyncInFlightRef.current = true;
    setInvoiceSyncLoading(true);
    const supabase = getSupabaseClient();
    try {
      const prev = formDataRef.current;
      const invoiceCurrency = normalizeCurrencyCode(
        payload.currencyIso ?? (prev.invoiceDetails?.currency as string) ?? "USD"
      );
        const issue = payload.issueDateIso;
        const due = payload.dueDateIso;
        const fallbackNet = Number(prev.invoiceDetails?.net_term ?? 30);
        const netTerm = diffNetTermDays(issue, due, fallbackNet);
        const seedRows = payload.seedLineItems;
      const effectiveRows =
          seedRows.length > 0
            ? seedRows
          : [
              {
                deal_deliverable_id: null as string | null,
                title: "Line item",
                description: null as string | null,
                quantity: 1,
                unit_price_cents: 0,
                total_cents: 0,
                tax_status: "out_of_scope" as const,
                tax_rate_bps: 0,
                tax_name: null,
              },
            ];
      const totalAmountCents = effectiveRows.reduce(
        (s, r) => s + lineItemTotalWithTaxCents(r),
        0
      );

      const { data: created, error: createErr } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          deal_id: effectiveDealId,
          issue_date: issue,
          due_date: due,
          status: "draft",
            net_term: netTerm,
          total_amount_cents: Math.round(totalAmountCents),
          currency: invoiceCurrency,
        })
        .select("id, invoice_number, issue_date, due_date, status, net_term, total_amount_cents, currency, company_id")
        .single();

      if (createErr || !created) {
        wallsToast.error("Could not create invoice", createErr?.message ?? "Unknown error");
          return false;
      }

      const invoiceId = created.id as string;
      const inserts = effectiveRows.map((row) => ({
        invoice_id: invoiceId,
        deal_deliverable_id: row.deal_deliverable_id || null,
        title: (row.title ?? "").trim() || "Line item",
        description: row.description ?? null,
        quantity: Number(row.quantity) || 0,
        unit_price_cents: Math.round(Number(row.unit_price_cents) || 0),
        total_cents: Math.round(
          row.total_cents ??
            lineItemTotalCents(Number(row.quantity) || 0, Number(row.unit_price_cents) || 0)
        ),
        tax_status: row.tax_status ?? "out_of_scope",
        tax_rate_bps: Math.max(0, Math.round(Number(row.tax_rate_bps) || 0)),
        tax_name: row.tax_name && String(row.tax_name).trim() ? String(row.tax_name).trim() : null,
      }));

      const { error: liErr } = await supabase.from("invoice_line_items").insert(inserts);
      if (liErr) {
        await supabase.from("invoices").delete().eq("id", invoiceId);
        wallsToast.error("Could not create line items", liErr.message);
          return false;
      }

      const { data: liRows } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      const invoiceDetails = {
        invoice_number: created.invoice_number ?? "",
        issue_date: created.issue_date ?? issue,
        due_date: created.due_date ?? due,
        status: created.status ?? "draft",
        net_term: Number(created.net_term ?? 30),
        currency: created.currency ?? "USD",
        total_amount_cents: Number(created.total_amount_cents ?? 0),
        company_id: created.company_id ?? companyId,
      };
      const invoiceLineItems = (liRows ?? []).map(mapDbLineToForm);
      setFormData((p: any) => ({
        ...p,
        _invoiceId: created.id,
        invoiceDetails,
        invoiceLineItems,
        invoicePayments: [],
      }));
      notifyInvoiceDraftSynced({
        _invoiceId: created.id,
        invoiceDetails,
        invoiceLineItems,
        invoicePayments: [],
      });
      await refreshInvoiceSummariesFromDb();
      wallsToast.success(
        "Invoice created",
        created.invoice_number ? `Saved as ${created.invoice_number}` : "Invoice saved to the database."
      );
        return true;
    } finally {
      invoiceSyncInFlightRef.current = false;
      setInvoiceSyncLoading(false);
    }
    },
    [dealId, selectedCompanyId, refreshInvoiceSummariesFromDb, notifyInvoiceDraftSynced, normalizeCurrencyCode]
  );

  const hydrateOrCreateInvoice = useCallback(
    async (opts?: {
      issueDateIso?: string;
      dueDateIso?: string;
      seedLineItems?: InvoiceLineItemForm[];
      currencyIso?: string;
    }): Promise<boolean> => {
      if (invoiceSyncInFlightRef.current) return false;
    const companyId = selectedCompanyId;
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
      if (!effectiveDealId || !companyId) return false;

    invoiceSyncInFlightRef.current = true;
    setInvoiceSyncLoading(true);
    const supabase = getSupabaseClient();

    try {
      const prev = formDataRef.current;
      const invoiceCurrency = normalizeCurrencyCode(
        opts?.currencyIso ?? (prev.invoiceDetails?.currency as string) ?? "USD"
      );
      const persistedId = (prev._invoiceId ?? prev.invoiceId) as string | null | undefined;

        const explicitSeed = opts?.seedLineItems !== undefined;
        const rows = explicitSeed
          ? (opts!.seedLineItems as InvoiceLineItemForm[])
          : ((prev.invoiceLineItems ?? []) as InvoiceLineItemForm[]);
      const lineSumWithTax = rows.reduce((s, r) => s + lineItemTotalWithTaxCents(r), 0);
      const deliverableTotal = (prev.deliverables ?? []).reduce((sum: number, item: any) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price_cents) || 0;
        return sum + qty * unit;
      }, 0);
        const totalAmountCents =
          rows.length > 0 ? lineSumWithTax : explicitSeed ? 0 : deliverableTotal;

        const issue =
          opts?.issueDateIso ??
          prev.invoiceDetails?.issue_date ??
          new Date().toISOString().split("T")[0];
      const due =
          opts?.dueDateIso ??
        prev.invoiceDetails?.due_date ??
        addDays(new Date(), 30).toISOString().split("T")[0];

        const fallbackNet = Number(prev.invoiceDetails?.net_term ?? 30);
        const netTermForInsert = explicitSeed
          ? diffNetTermDays(issue, due, fallbackNet)
          : fallbackNet;

      const applyInvoiceAndLines = async (inv: any, lines: any[]) => {
        const invoiceDetails = {
          invoice_number: inv.invoice_number ?? "",
          issue_date: inv.issue_date ?? issue,
          due_date: inv.due_date ?? due,
          status: inv.status ?? "draft",
          net_term: Number(inv.net_term ?? 30),
          currency: inv.currency ?? "USD",
          total_amount_cents: Number(inv.total_amount_cents ?? 0),
          company_id: inv.company_id ?? companyId,
        };
        const invoiceLineItems = (lines ?? []).map(mapDbLineToForm);
        let invoicePayments: InvoicePaymentForm[] = [];
        try {
          invoicePayments = await fetchInvoicePaymentsForInvoice(supabase, inv.id);
        } catch {
          invoicePayments = [];
        }
        setFormData((p: any) => ({
          ...p,
          _invoiceId: inv.id,
          invoiceDetails,
          invoiceLineItems,
          invoicePayments,
        }));
        notifyInvoiceDraftSynced({
          _invoiceId: inv.id,
          invoiceDetails,
          invoiceLineItems,
          invoicePayments,
        });
      };

      const replaceInvoiceWithSeedLines = async (invoiceId: string, baseInv: any): Promise<boolean> => {
        const effectiveRows =
          rows.length > 0
            ? rows
            : [
                {
                  deal_deliverable_id: null,
                  title: "Line item",
                  description: null as string | null,
                  quantity: 1,
                  unit_price_cents: 0,
                  total_cents: 0,
                  tax_status: "out_of_scope" as const,
                  tax_rate_bps: 0,
                  tax_name: null,
                },
              ];

        const { error: delErr } = await supabase
          .from("invoice_line_items")
          .delete()
          .eq("invoice_id", invoiceId);
        if (delErr) {
          wallsToast.error("Could not replace line items", delErr.message);
          return false;
        }

        const totalAmountCents = effectiveRows.reduce(
          (s, r) => s + lineItemTotalWithTaxCents(r),
          0
        );

        const inserts = effectiveRows.map((row) => ({
          invoice_id: invoiceId,
          deal_deliverable_id: row.deal_deliverable_id || null,
          title: (row.title ?? "").trim() || "Line item",
          description: row.description ?? null,
          quantity: Number(row.quantity) || 0,
          unit_price_cents: Math.round(Number(row.unit_price_cents) || 0),
          total_cents: Math.round(
            row.total_cents ??
              lineItemTotalCents(Number(row.quantity) || 0, Number(row.unit_price_cents) || 0)
          ),
          tax_status: row.tax_status ?? "out_of_scope",
          tax_rate_bps: Math.max(0, Math.round(Number(row.tax_rate_bps) || 0)),
          tax_name: row.tax_name && String(row.tax_name).trim() ? String(row.tax_name).trim() : null,
        }));

        const { error: liErr } = await supabase.from("invoice_line_items").insert(inserts);
        if (liErr) {
          wallsToast.error("Could not create line items", liErr.message);
          return false;
        }

        const { data: updatedInv, error: upErr } = await supabase
          .from("invoices")
          .update({
            issue_date: issue,
            due_date: due,
            net_term: netTermForInsert,
            total_amount_cents: Math.round(totalAmountCents),
            currency: invoiceCurrency,
          })
          .eq("id", invoiceId)
          .select("*")
          .maybeSingle();

        if (upErr) {
          wallsToast.error("Could not update invoice", upErr.message);
          return false;
        }

        const { data: liRows, error: liFetchErr } = await supabase
          .from("invoice_line_items")
          .select("*")
          .eq("invoice_id", invoiceId)
          .order("created_at", { ascending: true });

        if (liFetchErr) {
          wallsToast.error("Could not load line items", liFetchErr.message);
          return false;
        }

        await applyInvoiceAndLines(
          { ...baseInv, ...(updatedInv ?? {}), company_id: baseInv.company_id ?? companyId },
          liRows ?? []
        );
        await refreshInvoiceSummariesFromDb();
        return true;
      };

      if (persistedId) {
        const { data: inv, error: invErr } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", persistedId)
          .maybeSingle();

        if (!invErr && inv) {
          if (explicitSeed) {
            return await replaceInvoiceWithSeedLines(persistedId, inv);
          }

          const { data: liRows, error: liErr } = await supabase
            .from("invoice_line_items")
            .select("*")
            .eq("invoice_id", persistedId)
            .order("created_at", { ascending: true });

          if (liErr) {
            wallsToast.error("Could not load line items", liErr.message);
            return false;
          }
          await applyInvoiceAndLines(inv, liRows ?? []);
          return true;
        }
      }

      const { data: existingRows, error: findErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("deal_id", effectiveDealId)
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });

      if (findErr) {
        wallsToast.error("Invoice lookup failed", findErr.message);
        return false;
      }

      const rawList = existingRows ?? [];
      const summaries = await buildInvoiceSummaries(supabase, rawList as InvoiceRowForSummary[]);
      setInvoiceSummaries(summaries);

      const preferred = prev._invoiceId as string | undefined;
      const existing =
        rawList.find((r: { id: string }) => r.id === preferred) ?? pickNewestCreatedInvoice(rawList);

      if (existing) {
        if (explicitSeed) {
          return await replaceInvoiceWithSeedLines(existing.id, existing);
        }

        const { data: liRows, error: liErr } = await supabase
          .from("invoice_line_items")
          .select("*")
          .eq("invoice_id", existing.id)
          .order("created_at", { ascending: true });

        if (liErr) {
          wallsToast.error("Could not load line items", liErr.message);
          return false;
        }
        await applyInvoiceAndLines(existing, liRows ?? []);
        return true;
      }

      const insPayload = {
        company_id: companyId,
        deal_id: effectiveDealId,
        issue_date: issue,
        due_date: due,
        status: (prev.invoiceDetails?.status as string) ?? "draft",
        net_term: netTermForInsert,
        total_amount_cents: Math.round(totalAmountCents),
        currency: invoiceCurrency,
      };

      const { data: created, error: createErr } = await supabase
        .from("invoices")
        .insert(insPayload)
        .select("id, invoice_number, issue_date, due_date, status, net_term, total_amount_cents, currency, company_id")
        .single();

      if (createErr || !created) {
        wallsToast.error("Could not create invoice", createErr?.message ?? "Unknown error");
        return false;
      }

      const invoiceId = created.id as string;
      const effectiveRows =
        rows.length > 0
          ? rows
          : [
              {
                deal_deliverable_id: null,
                title: "Line item",
                description: null as string | null,
                quantity: 1,
                unit_price_cents: 0,
                total_cents: 0,
                tax_status: "out_of_scope" as const,
                tax_rate_bps: 0,
                tax_name: null,
              },
            ];

      const inserts = effectiveRows.map((row) => ({
        invoice_id: invoiceId,
        deal_deliverable_id: row.deal_deliverable_id || null,
        title: (row.title ?? "").trim() || "Line item",
        description: row.description ?? null,
        quantity: Number(row.quantity) || 0,
        unit_price_cents: Math.round(Number(row.unit_price_cents) || 0),
        total_cents: Math.round(
          row.total_cents ??
            lineItemTotalCents(Number(row.quantity) || 0, Number(row.unit_price_cents) || 0)
        ),
        tax_status: row.tax_status ?? "out_of_scope",
        tax_rate_bps: Math.max(0, Math.round(Number(row.tax_rate_bps) || 0)),
        tax_name: row.tax_name && String(row.tax_name).trim() ? String(row.tax_name).trim() : null,
      }));

      const { error: liErr } = await supabase.from("invoice_line_items").insert(inserts);

      if (liErr) {
        await supabase.from("invoices").delete().eq("id", invoiceId);
        wallsToast.error("Could not create line items", liErr.message);
        return false;
      }

      const { data: liRows } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      await applyInvoiceAndLines({ ...created, company_id: created.company_id ?? companyId }, liRows ?? []);
      await refreshInvoiceSummariesFromDb();
      wallsToast.success("Invoice created", created.invoice_number);
      return true;
    } finally {
      invoiceSyncInFlightRef.current = false;
      setInvoiceSyncLoading(false);
    }
  },
    [dealId, selectedCompanyId, refreshInvoiceSummariesFromDb, notifyInvoiceDraftSynced, normalizeCurrencyCode]
  );

  const handleSelectInvoicePanel = useCallback(
    (which: "preview" | "details") => {
      if (which === "preview") {
        setInvoiceDetailsPanelMode((m) => (m === "preview" ? "hidden" : "preview"));
        return;
      }
      if (invoiceDetailsPanelMode === "details") {
        setInvoiceDetailsPanelMode("hidden");
      return;
    }
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
    if (!effectiveDealId || !selectedCompanyId) {
      wallsToast.error("Cannot open invoice details", "Save the deal first and select a vendor company.");
      return;
    }
      setInvoiceDetailsPanelMode("details");
    void hydrateOrCreateInvoice();
    },
    [dealId, selectedCompanyId, invoiceDetailsPanelMode, hydrateOrCreateInvoice]
  );

  const handleOpenGenerateInvoiceDialog = () => {
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
    if (!effectiveDealId || !selectedCompanyId) {
      wallsToast.error("Cannot generate invoice", "Save the deal first and select a vendor company.");
      return;
    }
    invoiceDialogIntentRef.current = "hydrate";
    setGenerateInvoiceDialogVariant("first");
    setGenerateInvoiceDialogOpen(true);
  };

  const handleOpenNewInvoiceDialog = () => {
    const effectiveDealId = dealId && String(dealId).trim() ? dealId : null;
    if (!effectiveDealId || !selectedCompanyId) {
      wallsToast.error("Cannot create invoice", "Save the deal first and select a vendor company.");
      return;
    }
    invoiceDialogIntentRef.current = "createNew";
    setGenerateInvoiceDialogVariant("additional");
    setGenerateInvoiceDialogOpen(true);
  };

  const handleConfirmGenerateInvoice = async (payload: {
    issueDateIso: string;
    dueDateIso: string;
    selectedDeliverables: any[];
  }) => {
    setInvoiceDetailsPanelMode("details");
    const selectedCurrencies = Array.from(
      new Set(
        (payload.selectedDeliverables ?? []).map((d: any) => normalizeCurrencyCode(d?.currency))
      )
    );
    if (selectedCurrencies.length > 1) {
      wallsToast.error("Mixed currencies selected", "Generate invoices per currency and select deliverables with one currency at a time.");
      return;
    }
    const targetCurrency = selectedCurrencies[0] ?? normalizeCurrencyCode(invoiceDetails.currency);
    if (normalizeCurrencyCode(invoiceDetails.currency) !== targetCurrency) {
      updateInvoiceField("currency", targetCurrency);
    }
    const latest = formDataRef.current;
    const recommendation = recommendInvoiceTax({
      vendorCountry: latest.invoiceVendorInfo?.country ?? vendorInfo.country,
      vendorState: latest.invoiceVendorInfo?.state ?? vendorInfo.state,
      talentCountry: latest.dealTalent?.[0]?.talent_country ?? primaryDealTalent?.talent_country ?? null,
      talentTaxRegion: latest.dealTalent?.[0]?.talent_tax_region ?? primaryDealTalent?.talent_tax_region ?? null,
    });
    const seedLineItems = deliverablesToLineItemsWithRecommendedTax(
      payload.selectedDeliverables,
      targetCurrency,
      recommendation
    );
    if (invoiceDialogIntentRef.current === "createNew") {
      const ok = await createNewInvoiceWithSeed({
        issueDateIso: payload.issueDateIso,
        dueDateIso: payload.dueDateIso,
        seedLineItems,
        currencyIso: targetCurrency,
      });
      if (ok) setGenerateInvoiceDialogOpen(false);
    } else {
      const ok = await hydrateOrCreateInvoice({
        issueDateIso: payload.issueDateIso,
        dueDateIso: payload.dueDateIso,
        seedLineItems,
        currencyIso: targetCurrency,
      });
      if (ok) setGenerateInvoiceDialogOpen(false);
    }
  };

  const derivedDates = useMemo(() => deriveInvoiceDates(formData), [formData]);

  return (
    <div className="space-y-6">
      <GenerateInvoiceDialog
        open={generateInvoiceDialogOpen}
        onOpenChange={(next) => {
          if (!next && invoiceSyncLoading) return;
          setGenerateInvoiceDialogOpen(next);
        }}
        formData={formData}
        deliverables={formData.deliverables ?? []}
        isSubmitting={invoiceSyncLoading}
        onConfirm={handleConfirmGenerateInvoice}
        variant={generateInvoiceDialogVariant}
        dealId={dealId ?? null}
        vendorCompanyId={selectedCompanyId}
      />

      <VendorDetailsCard
        showVendorDetails={showVendorDetails}
        onToggleVendorDetails={() => setShowVendorDetails((v) => !v)}
        showVendorInvoiceWarning={showVendorInvoiceWarning}
        vendorInvoiceWarningTooltip={vendorInvoiceWarningTooltip}
        dealCompanies={dealCompanies}
        selectedCompanyId={selectedCompanyId}
        onSelectVendor={handleSelectVendor}
        loadingVendor={loadingVendor}
        vendorInfo={vendorInfo}
        onVendorFieldChange={updateField}
      />

      {selectedCompanyId && isVendorInfoComplete(vendorInfo) && (
        <InvoiceDetailsCard
          formData={formData}
              vendorInfo={vendorInfo}
              dealName={formData.dealName ?? ""}
          selectedCompanyId={selectedCompanyId}
          dealId={dealId ?? null}
          invoiceSummaries={invoiceSummaries}
          invoiceSyncLoading={invoiceSyncLoading}
          invoiceDetailsPanelMode={invoiceDetailsPanelMode}
          onSelectInvoicePanel={handleSelectInvoicePanel}
          onInvoiceSwitch={handleInvoiceSwitch}
          onCreateNewInvoice={handleOpenNewInvoiceDialog}
          onGenerateInvoice={handleOpenGenerateInvoiceDialog}
          onDeleteCurrentInvoice={() => {
            void handleDeleteCurrentInvoice();
          }}
          onPersistInvoice={persistInvoiceToDatabase}
          onDownloadPdf={() => invoicePreviewRef.current?.downloadPdf() ?? Promise.resolve()}
          invoiceDetails={invoiceDetails}
          displayTotalCents={displayTotalCents}
          deliverables={deliverables}
          derivedDates={derivedDates}
          invoicePreviewRef={invoicePreviewRef}
          onUpdateInvoiceField={updateInvoiceField}
          onAddLineItem={addLineItem}
          onRemoveLineItem={removeLineItem}
          onUpdateLineItem={updateLineItem}
          onApplyDeliverableToLine={applyDeliverableToLine}
          onApplyTaxToAllLineItems={applyTaxToAllLineItems}
          taxRecommendation={taxRecommendation}
          onApplyRecommendedTax={() => applyTaxToAllLineItems(taxRecommendation.dropdownValue)}
          onAddInvoicePayment={addInvoicePayment}
          onUpdateInvoicePayment={updateInvoicePayment}
          onRemoveInvoicePayment={removeInvoicePayment}
          canManageInvoiceWisePayments={canManageInvoiceWisePayments}
          onInvoiceEmailSent={({ dbStatusUpdated }) => {
            if (dbStatusUpdated) {
              applyAutoSentInvoiceStatus();
            }
            void refreshInvoiceSummariesFromDb();
          }}
        />
      )}
    </div>
  );
}
