"use client";

import React from "react";
import { CardCRM as Card, CardContentCRM as CardContent } from "@/components/ui/card-crm";
import { LedgerEntry, LedgerEntryType, LedgerStatus, LedgerSource } from "../types";
import { cn } from '@walls/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Receipt,
  RefreshCcw,
  Percent,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Building2,
  HandCoins,
  CreditCard,
} from "lucide-react";

type ColumnWidths = {
  date: number;
  type: number;
  description: number;
  recipient: number;
  amount: number;
  status: number;
  source: number;
};

interface LedgerTableRowProps {
  entry: LedgerEntry;
  index: number;
  scrollableRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  isScrollingRef: React.MutableRefObject<boolean>;
  columnWidths: ColumnWidths;
  formatDate: (date: string) => string;
  formatAmount: (amount: number, currency: string) => string;
}

function getTypeIcon(type: LedgerEntryType) {
  switch (type) {
    case "payment":
      return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
    case "payout":
      return <ArrowUpRight className="h-4 w-4 text-amber-600" />;
    case "income":
      return <Banknote className="h-4 w-4 text-blue-600" />;
    case "refund":
      return <RefreshCcw className="h-4 w-4 text-slate-500" />;
    case "fee":
      return <Percent className="h-4 w-4 text-neutral-500" />;
    default:
      return <Receipt className="h-4 w-4 text-neutral-500" />;
  }
}

function getTypeLabel(type: LedgerEntryType) {
  const labels: Record<LedgerEntryType, string> = {
    payment: "Payment",
    payout: "Payout",
    income: "Income",
    refund: "Refund",
    fee: "Fee",
  };
  return labels[type] ?? type;
}

function getStatusIcon(status: LedgerStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "pending":
      return <Clock className="h-4 w-4 text-amber-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "processing":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-neutral-400" />;
  }
}

function getStatusLabel(status: LedgerStatus) {
  const labels: Record<LedgerStatus, string> = {
    completed: "Completed",
    pending: "Pending",
    failed: "Failed",
    processing: "Processing",
  };
  return labels[status] ?? status;
}

function getSourceIcon(source: LedgerSource) {
  switch (source) {
    case "wise":
      return <Building2 className="h-4 w-4 text-neutral-600" />;
    case "manual":
      return <HandCoins className="h-4 w-4 text-neutral-500" />;
    case "stripe":
      return <CreditCard className="h-4 w-4 text-indigo-500" />;
    default:
      return <Receipt className="h-4 w-4 text-neutral-400" />;
  }
}

function getSourceLabel(source: LedgerSource) {
  const labels: Record<LedgerSource, string> = {
    wise: "WISE",
    manual: "Manual",
    stripe: "Stripe",
    other: "Other",
  };
  return labels[source] ?? source;
}

export function LedgerTableRow({
  entry,
  index,
  scrollableRefs,
  headerScrollRef,
  isScrollingRef,
  columnWidths,
  formatDate,
  formatAmount,
}: LedgerTableRowProps) {
  const isOutflow = entry.type === "payout" || entry.type === "fee";

  return (
    <Card className="w-full rounded-none bg-white border-x border-b border-neutral-200/50 shadow-sm hover:bg-neutral-50/80 transition-colors">
      <CardContent className="py-0">
        <div
          ref={(el) => {
            if (el) scrollableRefs.current[index] = el;
          }}
          className="flex items-center min-w-max pl-0 overflow-x-auto scrollbar-hide"
          onScroll={(e) => {
            if (isScrollingRef.current) return;
            const target = e.currentTarget;
            isScrollingRef.current = true;
            const scrollLeft = target.scrollLeft;
            scrollableRefs.current.forEach((ref) => {
              if (ref && ref !== target) ref.scrollLeft = scrollLeft;
            });
            if (headerScrollRef.current && headerScrollRef.current !== target) {
              headerScrollRef.current.scrollLeft = scrollLeft;
            }
            requestAnimationFrame(() => {
              isScrollingRef.current = false;
            });
          }}
        >
          <div className="flex items-center min-w-max pl-8 py-3" style={{ gap: "0.5rem" }}>
            <div
              className="flex items-center flex-shrink-0 pl-3 text-sm text-neutral-700"
              style={{ width: `${columnWidths.date}px` }}
            >
              {formatDate(entry.date)}
            </div>
            <div
              className="flex items-center flex-shrink-0 gap-2"
              style={{ width: `${columnWidths.type}px` }}
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100">
                {getTypeIcon(entry.type)}
              </span>
              <span className="text-sm font-medium text-neutral-800">
                {getTypeLabel(entry.type)}
              </span>
            </div>
            <div
              className="flex items-center flex-shrink-0 text-sm text-neutral-600 truncate"
              style={{ width: `${columnWidths.description}px` }}
              title={entry.description}
            >
              {entry.description}
            </div>
            <div
              className="flex items-center flex-shrink-0 text-sm font-medium text-neutral-800 truncate"
              style={{ width: `${columnWidths.recipient}px` }}
              title={entry.recipientOrPayer}
            >
              {entry.recipientOrPayer}
            </div>
            <div
              className={cn(
                "flex items-center flex-shrink-0 justify-end text-sm font-semibold tabular-nums",
                isOutflow ? "text-amber-700" : "text-emerald-700"
              )}
              style={{ width: `${columnWidths.amount}px` }}
            >
              {isOutflow ? "-" : "+"}
              {formatAmount(Math.abs(entry.amount), entry.currency)}
            </div>
            <div
              className="flex items-center flex-shrink-0 gap-1.5"
              style={{ width: `${columnWidths.status}px` }}
            >
              {getStatusIcon(entry.status)}
              <span className="text-sm text-neutral-600">
                {getStatusLabel(entry.status)}
              </span>
            </div>
            <div
              className="flex items-center flex-shrink-0 gap-1.5"
              style={{ width: `${columnWidths.source}px` }}
            >
              {getSourceIcon(entry.source)}
              <span className="text-sm text-neutral-500">
                {getSourceLabel(entry.source)}
              </span>
            </div>
            <div style={{ width: "24px" }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
