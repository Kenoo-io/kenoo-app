import type { InvoiceLineItemForm, InvoicePaymentForm } from "./invoice-types";
import { TAX_DROPDOWN_OPTIONS } from "./canadian-tax-options";
import type { InvoiceTaxRecommendation } from "@/lib/invoice/recommend-invoice-tax";

/** Row shape from `wise_transactions` when joining for invoice payments. */
type WiseTransactionJoinRow = {
  id: string;
  wise_transaction_id?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  wise_created_at?: string | null;
  type?: string | null;
  merchant_name?: string | null;
};

export function lineItemTotalCents(qty: number, unitCents: number): number {
  return Math.round((Number(qty) || 0) * (Number(unitCents) || 0));
}

function normalizeCurrencyCode(value: unknown): string {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return raw || "USD";
}

export function lineItemTaxCents(subtotalCents: number, taxRateBps: number): number {
  const subtotal = Number(subtotalCents) || 0;
  const bps = Math.max(0, Number(taxRateBps) || 0);
  return Math.round((subtotal * bps) / 10000);
}

export function lineItemTotalWithTaxCents(row: {
  quantity: number;
  unit_price_cents: number;
  total_cents?: number;
  tax_rate_bps?: number;
}): number {
  const subtotal = Number(row.total_cents) || lineItemTotalCents(row.quantity, row.unit_price_cents);
  const tax = lineItemTaxCents(subtotal, Number(row.tax_rate_bps) || 0);
  return subtotal + tax;
}

export function mapDbLineToForm(row: {
  id: string;
  deal_deliverable_id?: string | null;
  title: string;
  description?: string | null;
  quantity: number | string;
  unit_price_cents: number;
  total_cents: number;
  tax_status?: "out_of_scope" | "taxable" | "exempt" | "zero_rated" | null;
  tax_rate_bps?: number | null;
  tax_name?: string | null;
}): InvoiceLineItemForm {
  return {
    id: row.id,
    deal_deliverable_id: row.deal_deliverable_id ?? null,
    title: row.title,
    description: row.description ?? null,
    quantity: Number(row.quantity) || 0,
    unit_price_cents: Number(row.unit_price_cents) || 0,
    total_cents: Number(row.total_cents) || 0,
    tax_status: row.tax_status ?? "out_of_scope",
    tax_rate_bps: Number(row.tax_rate_bps) || 0,
    tax_name: row.tax_name ?? null,
  };
}

/** Loads `invoice_payments` for an invoice and enriches from `wise_transactions` when present. */
export async function fetchInvoicePaymentsForInvoice(
  supabase: { from: (t: string) => any },
  invoiceId: string
): Promise<InvoicePaymentForm[]> {
  const { data: payRows, error } = await supabase
    .from("invoice_payments")
    .select("id, transaction_id, created_at")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const list = (payRows ?? []) as { id: string; transaction_id: string | null }[];
  if (!list.length) return [];
  const wtIds = Array.from(
    new Set(list.map((r) => (r.transaction_id ? String(r.transaction_id).trim() : "")).filter(Boolean))
  );
  if (!wtIds.length) {
    return list.map((r) => ({
      id: r.id,
      transaction_id: "",
      wise_transaction_id: null,
      amount: null,
      currency: null,
      wise_created_at: null,
      type: null,
      merchant_name: null,
    }));
  }
  const { data: wtRows, error: wtErr } = await supabase
    .from("wise_transactions")
    .select("id, wise_transaction_id, amount, currency, wise_created_at, type, merchant_name")
    .in("id", wtIds);
  if (wtErr) throw wtErr;
  const wtMap = new Map<string, WiseTransactionJoinRow>(
    ((wtRows ?? []) as WiseTransactionJoinRow[]).map((w) => [String(w.id), w])
  );
  return list.map((r) => {
    const tid = r.transaction_id ? String(r.transaction_id).trim() : "";
    const wt: WiseTransactionJoinRow | undefined = tid ? wtMap.get(tid) : undefined;
    return {
      id: r.id,
      transaction_id: tid,
      wise_transaction_id: wt?.wise_transaction_id != null ? String(wt.wise_transaction_id) : null,
      amount: wt?.amount != null ? Number(wt.amount) : null,
      currency: wt?.currency != null ? String(wt.currency) : null,
      wise_created_at: wt?.wise_created_at != null ? String(wt.wise_created_at) : null,
      type: wt?.type != null ? String(wt.type) : null,
      merchant_name: wt?.merchant_name != null ? String(wt.merchant_name) : null,
    };
  });
}

/** Per-invoice count of `invoice_payments` rows with a non-empty `transaction_id`. */
export async function fetchInvoiceWiseLinkCounts(
  supabase: { from: (t: string) => any },
  invoiceIds: string[]
): Promise<Map<string, number>> {
  const ids = invoiceIds.map((id) => String(id).trim()).filter(Boolean);
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from("invoice_payments")
    .select("invoice_id, transaction_id")
    .in("invoice_id", ids);
  if (error) {
    console.error("[fetchInvoiceWiseLinkCounts]", error);
    return new Map();
  }
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const invId = row.invoice_id != null ? String(row.invoice_id) : "";
    const tid = row.transaction_id != null ? String(row.transaction_id).trim() : "";
    if (!invId || !tid) continue;
    counts.set(invId, (counts.get(invId) ?? 0) + 1);
  }
  return counts;
}

export function deliverablesToLineItems(
  deliverables: any[],
  invoiceCurrency?: string | null
): InvoiceLineItemForm[] {
  const targetCurrency = invoiceCurrency ? normalizeCurrencyCode(invoiceCurrency) : null;
  return (deliverables ?? [])
    .filter((d) => {
      if (!targetCurrency) return true;
      return normalizeCurrencyCode(d?.currency) === targetCurrency;
    })
    .map((d) => {
    const qty = Number(d.quantity) || 1;
    const unit = Number(d.unit_price_cents) || 0;
    return {
      deal_deliverable_id: d.id ?? null,
      title: (d.name ?? "").trim() || "Line item",
      description: d.description ?? "",
      quantity: qty,
      unit_price_cents: unit,
      total_cents: lineItemTotalCents(qty, unit),
      tax_status: "out_of_scope",
      tax_rate_bps: 0,
      tax_name: null,
    };
  });
}

export function applyTaxDropdownValueToLineItems(
  lineItems: InvoiceLineItemForm[],
  dropdownValue: string
): InvoiceLineItemForm[] {
  const selected = TAX_DROPDOWN_OPTIONS.find((opt) => opt.value === dropdownValue);
  if (!selected) return lineItems;
  return lineItems.map((row) => ({
    ...row,
    tax_status: selected.taxStatus,
    tax_rate_bps: selected.taxRateBps,
    tax_name: selected.taxName,
  }));
}

export function applyRecommendedTaxToLineItems(
  lineItems: InvoiceLineItemForm[],
  recommendation: InvoiceTaxRecommendation
): InvoiceLineItemForm[] {
  return applyTaxDropdownValueToLineItems(lineItems, recommendation.dropdownValue);
}

export function deliverablesToLineItemsWithRecommendedTax(
  deliverables: any[],
  invoiceCurrency: string | null | undefined,
  recommendation: InvoiceTaxRecommendation
): InvoiceLineItemForm[] {
  const rows = deliverablesToLineItems(deliverables, invoiceCurrency);
  return applyRecommendedTaxToLineItems(rows, recommendation);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Net days between issue and due (`YYYY-MM-DD`), or `fallback` if invalid. */
export function diffNetTermDays(issueIso: string, dueIso: string, fallback: number): number {
  const a = new Date(`${issueIso}T12:00:00`);
  const b = new Date(`${dueIso}T12:00:00`);
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms)) return fallback;
  const d = Math.round(ms / 86400000);
  if (!Number.isFinite(d) || d < 0) return fallback;
  return d;
}

/** ISO `YYYY-MM-DD`: issue is today; due follows net payout + deliverable net days when possible, else today + 30. */
export function suggestedInvoiceDatesIso(formData: { events?: any[]; deliverables?: any[] }) {
  const issueDateIso = new Date().toISOString().split("T")[0];
  const events = formData.events ?? [];
  const deliverables = formData.deliverables ?? [];
  const netPayoutStart = events.find((e: any) => e.event_type === "net_payout_start");
  let dueDateIso = addDays(new Date(), 30).toISOString().split("T")[0];

  if (netPayoutStart?.due_at) {
    const relatedDeliverable = netPayoutStart.related_deliverable_id
      ? deliverables.find((d: any) => d.id === netPayoutStart.related_deliverable_id)
      : null;
    const fallbackDeliverable = deliverables.find((d: any) => d.net_payout != null && d.net_payout !== "");
    const deliverableForNet = relatedDeliverable ?? fallbackDeliverable;
    const netDays =
      deliverableForNet?.net_payout != null && deliverableForNet.net_payout !== ""
        ? Number(deliverableForNet.net_payout)
        : null;
    if (netDays != null && !Number.isNaN(netDays)) {
      const startDate = new Date(netPayoutStart.due_at);
      if (!Number.isNaN(startDate.getTime())) {
        dueDateIso = addDays(startDate, netDays).toISOString().split("T")[0];
      }
    }
  }

  return { issueDateIso, dueDateIso };
}

export function formatInvoiceDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Derive NET Term and Due Date from Events (Net Payout Start) + Deliverables (net_payout days) */
export function deriveInvoiceDates(formData: { events?: any[]; deliverables?: any[]; [key: string]: any }) {
  const events = formData.events ?? [];
  const deliverables = formData.deliverables ?? [];
  const netPayoutStart = events.find((e: any) => e.event_type === "net_payout_start");
  if (!netPayoutStart) {
    return { issueDate: formatInvoiceDate(new Date()), netTerm: "—", dueDate: "—" };
  }
  const relatedDeliverable = netPayoutStart.related_deliverable_id
    ? deliverables.find((d: any) => d.id === netPayoutStart.related_deliverable_id)
    : null;
  const fallbackDeliverable = deliverables.find((d: any) => d.net_payout != null && d.net_payout !== "");
  const deliverableForNet = relatedDeliverable ?? fallbackDeliverable;
  const netDays =
    deliverableForNet?.net_payout != null && deliverableForNet.net_payout !== ""
      ? Number(deliverableForNet.net_payout)
      : null;
  const netTerm = netDays != null && !Number.isNaN(netDays) ? `Net ${netDays}` : "—";
  let dueDate = "—";
  if (netPayoutStart.due_at && netDays != null && !Number.isNaN(netDays)) {
    const startDate = new Date(netPayoutStart.due_at);
    if (!Number.isNaN(startDate.getTime())) {
      dueDate = formatInvoiceDate(addDays(startDate, netDays));
    }
  }
  const issueDate = formatInvoiceDate(new Date());
  return { issueDate, netTerm, dueDate };
}
