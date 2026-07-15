import {
  fetchInvoicePaymentsForInvoice,
  lineItemTotalCents,
  lineItemTotalWithTaxCents,
  mapDbLineToForm,
} from "./invoice-helpers";
import type { InvoiceLineItemForm, InvoicePaymentForm } from "./invoice-types";

export type PersistInvoiceFromFormResult =
  | { ok: false; message: string }
  | { ok: true; skipped: true }
  | {
      ok: true;
      skipped: false;
      invoiceDetails: Record<string, unknown>;
      invoiceLineItems: InvoiceLineItemForm[];
      invoicePayments: InvoicePaymentForm[];
    };

/** Result of a successful write (for callers that need narrowed typing). */
export type PersistedInvoiceFromForm = Extract<PersistInvoiceFromFormResult, { skipped: false }>;

export type PersistInvoiceFromFormOptions = {
  /** When false, `invoice_payments` are not read from the form; existing DB links stay unchanged. */
  syncInvoicePayments?: boolean;
};

/**
 * Writes `formData.invoiceDetails` and `formData.invoiceLineItems` to `invoices` / `invoice_line_items`.
 * When saving a deal after deliverables were recreated, pass `deliverableIdRemap` so line items keep valid FKs.
 */
export async function persistInvoiceFromFormData(
  supabase: any,
  formData: Record<string, unknown>,
  deliverableIdRemap: Record<string, string> = {},
  options: PersistInvoiceFromFormOptions = {}
): Promise<PersistInvoiceFromFormResult> {
  const syncInvoicePayments = options.syncInvoicePayments !== false;
  const invoiceId = formData._invoiceId as string | undefined;
  if (!invoiceId) {
    return { ok: true, skipped: true };
  }

  const prevDetails = (formData.invoiceDetails ?? {}) as Record<string, unknown>;
  const rawRows = (formData.invoiceLineItems ?? []) as InvoiceLineItemForm[];
  const rows = rawRows.map((row) => {
    const rawDid = row.deal_deliverable_id;
    const trimmed = rawDid != null && String(rawDid).trim() ? String(rawDid).trim() : "";
    const nextDid =
      trimmed && deliverableIdRemap[trimmed] ? deliverableIdRemap[trimmed] : trimmed || null;
    return { ...row, deal_deliverable_id: nextDid };
  });

  const lineSum = rows.reduce((s, r) => s + lineItemTotalWithTaxCents(r), 0);
  const { error: upErr } = await supabase
    .from("invoices")
    .update({
      invoice_number: (prevDetails.invoice_number as string) ?? "",
      issue_date: prevDetails.issue_date,
      due_date: prevDetails.due_date,
      status: (prevDetails.status as string) ?? "draft",
      net_term: Number(prevDetails.net_term ?? 30),
      total_amount_cents: Math.round(lineSum),
      currency: (prevDetails.currency as string) ?? "USD",
    })
    .eq("id", invoiceId);

  if (upErr) {
    return { ok: false, message: upErr.message };
  }

  const { data: existingLineRows, error: exLinesErr } = await supabase
    .from("invoice_line_items")
    .select("id")
    .eq("invoice_id", invoiceId);
  if (exLinesErr) {
    return { ok: false, message: exLinesErr.message };
  }
  const existingLineIdList = (existingLineRows ?? []).map((r: { id: string }) => r.id);
  const existingLineIds = new Set(existingLineIdList);

  const formLineIdsKept = new Set(
    rows.map((r) => r.id).filter((id): id is string => Boolean(id))
  );
  const lineIdsToRemove = existingLineIdList.filter((id) => !formLineIdsKept.has(id));
  if (lineIdsToRemove.length > 0) {
    const { error: liDelErr } = await supabase.from("invoice_line_items").delete().in("id", lineIdsToRemove);
    if (liDelErr) {
      return { ok: false, message: liDelErr.message };
    }
  }

  for (const row of rows) {
    const linePayload = {
      deal_deliverable_id: row.deal_deliverable_id || null,
      title: (row.title ?? "").trim() || "Line item",
      description: row.description ?? null,
      quantity: Number(row.quantity) || 0,
      unit_price_cents: Math.round(Number(row.unit_price_cents) || 0),
      total_cents: Math.round(
        row.total_cents ?? lineItemTotalCents(Number(row.quantity) || 0, Number(row.unit_price_cents) || 0)
      ),
      tax_status: row.tax_status ?? "out_of_scope",
      tax_rate_bps: Math.max(0, Math.round(Number(row.tax_rate_bps) || 0)),
      tax_name: row.tax_name && String(row.tax_name).trim() ? String(row.tax_name).trim() : null,
    };

    if (row.id && existingLineIds.has(row.id)) {
      const { error: liUpErr } = await supabase
        .from("invoice_line_items")
        .update(linePayload)
        .eq("id", row.id)
        .eq("invoice_id", invoiceId);
      if (liUpErr) {
        return { ok: false, message: liUpErr.message };
      }
    } else {
      const { error: liInsErr } = await supabase
        .from("invoice_line_items")
        .insert({ invoice_id: invoiceId, ...linePayload });
      if (liInsErr) {
        return { ok: false, message: liInsErr.message };
      }
    }
  }

  const { data: liRows, error: liSelErr } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  if (liSelErr) {
    return { ok: false, message: liSelErr.message };
  }

  const invoiceLineItems = (liRows ?? []).map((r) => mapDbLineToForm(r as any));
  const invoiceDetails = {
    ...prevDetails,
    total_amount_cents: Math.round(lineSum),
  };

  if (syncInvoicePayments) {
    const formPaymentsRaw = (formData.invoicePayments ?? []) as InvoicePaymentForm[];
    const wantedOrdered: string[] = [];
    const seenWtId = new Set<string>();
    for (const p of formPaymentsRaw) {
      const tid = String(p.transaction_id ?? "").trim();
      if (!tid || seenWtId.has(tid)) continue;
      seenWtId.add(tid);
      wantedOrdered.push(tid);
    }

    if (wantedOrdered.length > 0) {
      const { data: validRows, error: vErr } = await supabase
        .from("wise_transactions")
        .select("id")
        .in("id", wantedOrdered);
      if (vErr) {
        return { ok: false, message: vErr.message };
      }
      const validSet = new Set((validRows ?? []).map((r: { id: string }) => String(r.id)));
      for (const tid of wantedOrdered) {
        if (!validSet.has(tid)) {
          return {
            ok: false,
            message: `Wise transaction not found in ledger (sync Wise first): ${tid}`,
          };
        }
      }
    }

    const { data: existingPayRows, error: exPayErr } = await supabase
      .from("invoice_payments")
      .select("id, transaction_id")
      .eq("invoice_id", invoiceId);
    if (exPayErr) {
      return { ok: false, message: exPayErr.message };
    }
    const existingPay = (existingPayRows ?? []) as { id: string; transaction_id: string | null }[];
    const wantedSet = new Set(wantedOrdered);
    const toRemove = existingPay.filter((r) => {
      const t = r.transaction_id ? String(r.transaction_id).trim() : "";
      return !wantedSet.has(t);
    });
    if (toRemove.length > 0) {
      const { error: payDelErr } = await supabase
        .from("invoice_payments")
        .delete()
        .in(
          "id",
          toRemove.map((r) => r.id)
        );
      if (payDelErr) {
        return { ok: false, message: payDelErr.message };
      }
    }
    const existingWtIds = new Set(
      existingPay
        .map((r) => (r.transaction_id ? String(r.transaction_id).trim() : ""))
        .filter(Boolean)
    );
    const toInsert = wantedOrdered.filter((tid) => !existingWtIds.has(tid));
    if (toInsert.length > 0) {
      const { error: payInsErr } = await supabase.from("invoice_payments").insert(
        toInsert.map((transaction_id) => ({
          invoice_id: invoiceId,
          transaction_id,
        }))
      );
      if (payInsErr) {
        return { ok: false, message: payInsErr.message };
      }
    }
  }

  let invoicePayments: InvoicePaymentForm[] = [];
  try {
    invoicePayments = await fetchInvoicePaymentsForInvoice(supabase, invoiceId);
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not reload invoice payment links" };
  }

  return { ok: true, skipped: false, invoiceDetails, invoiceLineItems, invoicePayments };
}

/** Stable string for dirty-checking invoice draft fields between form and last-saved snapshot. */
export function invoiceDraftCompareKey(formData: Record<string, unknown> | null | undefined): string | null {
  const fd = formData as Record<string, unknown> | undefined;
  if (!fd) return null;
  const id = fd._invoiceId ?? null;
  const det = fd.invoiceDetails as Record<string, unknown> | undefined;
  const lines = (fd.invoiceLineItems ?? []) as Record<string, unknown>[];
  if (!id && !det && lines.length === 0) return null;
  const normDet = det
    ? {
        invoice_number: String(det.invoice_number ?? "").trim(),
        issue_date: String(det.issue_date ?? ""),
        due_date: String(det.due_date ?? ""),
        status: String(det.status ?? ""),
        net_term: Number(det.net_term ?? 30),
        currency: String(det.currency ?? "USD"),
        total_amount_cents: Number(det.total_amount_cents ?? 0),
      }
    : null;
  const normLines = lines.map((r) => ({
    deal_deliverable_id: r.deal_deliverable_id ?? null,
    title: String(r.title ?? "").trim(),
    description: String(r.description ?? ""),
    quantity: Number(r.quantity) || 0,
    unit_price_cents: Number(r.unit_price_cents) || 0,
    total_cents: Number(r.total_cents) || 0,
    tax_status: String(r.tax_status ?? "out_of_scope"),
    tax_rate_bps: Number(r.tax_rate_bps) || 0,
    tax_name: r.tax_name == null ? null : String(r.tax_name).trim(),
  }));
  const payments = (fd.invoicePayments ?? []) as { transaction_id?: unknown }[];
  const normPayments = payments
    .map((p) => String(p.transaction_id ?? "").trim())
    .filter(Boolean)
    .sort();
  return JSON.stringify({ id, det: normDet, lines: normLines, payments: normPayments });
}

export function hasInvoiceDraftChanged(
  current: Record<string, unknown>,
  saved: Record<string, unknown>
): boolean {
  return invoiceDraftCompareKey(current) !== invoiceDraftCompareKey(saved);
}
