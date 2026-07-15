/** Draft row aligned with `invoice_line_items` (invoice_id set on persist). */
export type InvoiceLineItemForm = {
  id?: string;
  deal_deliverable_id?: string | null;
  title: string;
  description?: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  tax_status: "out_of_scope" | "taxable" | "exempt" | "zero_rated";
  tax_rate_bps: number;
  tax_name?: string | null;
};

/** Row aligned with `invoice_payments` + optional joined `wise_transactions` for display. */
export type InvoicePaymentForm = {
  id?: string;
  /** FK to `wise_transactions.id` (UUID). */
  transaction_id: string;
  /** External Wise reference; denormalized from `wise_transactions` for display. */
  wise_transaction_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  wise_created_at?: string | null;
  type?: string | null;
  merchant_name?: string | null;
};

export interface VendorInformationRow {
  id: string;
  company_id: string;
  legal_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  address: string | null;
  post_code: string | null;
  vendor_email: string | null;
}
