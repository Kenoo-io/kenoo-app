export type LedgerEntryType = "payment" | "payout" | "income" | "refund" | "fee";
export type LedgerStatus = "completed" | "pending" | "failed" | "processing";
export type LedgerSource = "wise" | "manual" | "stripe" | "other";

export interface LedgerEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  description: string;
  recipientOrPayer: string;
  amount: number;
  currency: string;
  status: LedgerStatus;
  source: LedgerSource;
  reference?: string;
  talentId?: string;
  dealId?: string;
  createdAt: string;
  /** Raw type from source (e.g. Wise: TRANSFER, CARD). Shown on transaction cards. */
  sourceType?: string;
  /** USD equivalent for chart/summary when available (e.g. from wise_transactions.usd_amount). */
  usd_amount?: number | null;
}

export interface LedgerFilters {
  searchTerm: string;
  type: string;
  status: string;
  source: string;
  dateFrom: string;
  dateTo: string;
}

export interface LedgerSummary {
  totalIncome: number;
  totalPayouts: number;
  pendingAmount: number;
  completedThisMonth: number;
}
