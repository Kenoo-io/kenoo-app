"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from '@walls/utils';

export interface RecipientRow {
  id: string;
  wise_recipient_id: string | null;
  recipient_name: string | null;
  payout_currency: string | null;
  payout_country: string | null;
  payout_type: string | null;
  legal_type: string | null;
  bank_details: Record<string, unknown> | null;
  can_receive_payments: boolean | null;
  kyc_status: string | null;
  contact_email: string | null;
}

interface RecipientCardProps {
  recipient: RecipientRow;
  index: number;
}

function formatPayoutType(type: string | null): string {
  if (!type) return "—";
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RecipientCard({ recipient, index }: RecipientCardProps) {
  const name = recipient.recipient_name || "Unknown Recipient";
  const currency = recipient.payout_currency ?? "—";
  const country = recipient.payout_country ?? null;
  const payoutType = formatPayoutType(recipient.payout_type);
  const legalType = recipient.legal_type ?? null;
  const canReceive = recipient.can_receive_payments;
  const kycStatus = recipient.kyc_status;

  // Derive a short bank detail summary from bank_details JSON
  const bankSummary = React.useMemo(() => {
    const d = recipient.bank_details;
    if (!d || typeof d !== "object") return null;
    // Try common fields in order of preference
    const acct =
      (d.accountNumber as string | undefined) ??
      (d.iban as string | undefined) ??
      (d.sortCode as string | undefined) ??
      (d.abartn as string | undefined) ??
      null;
    if (!acct) return null;
    const masked =
      acct.length > 4 ? `••••${acct.slice(-4)}` : acct;
    return masked;
  }, [recipient.bank_details]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-[4rem] border border-neutral-200/60 bg-neutral-100 shadow-inner px-12 py-6 min-h-[5rem] flex flex-row items-center justify-between gap-4"
    >
      {/* Left: name + meta */}
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <p className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tight uppercase line-clamp-1">
          {name}
        </p>
        <p className="text-sm font-light text-neutral-500">
          {[
            payoutType !== "—" ? payoutType : null,
            legalType ? legalType.charAt(0) + legalType.slice(1).toLowerCase() : null,
            recipient.contact_email ?? null,
          ]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>

      {/* Right: currency + country + status */}
      <div className="flex flex-col items-end flex-shrink-0 gap-1">
        {/* Currency badge */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl md:text-5xl font-black tabular-nums tracking-tight text-neutral-900">
            {currency}
          </span>
          {country && (
            <span className="text-sm font-light text-neutral-400 uppercase">
              {country}
            </span>
          )}
        </div>

        {/* Bank account masked + status */}
        <div className="flex items-center gap-2">
          {bankSummary && (
            <span className="text-sm font-light text-neutral-400">
              {bankSummary}
            </span>
          )}
          {canReceive != null && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                canReceive
                  ? "bg-lime-100 text-lime-700"
                  : "bg-neutral-200 text-neutral-500"
              )}
            >
              {canReceive ? "Active" : "Inactive"}
            </span>
          )}
          {kycStatus && kycStatus !== "null" && (
            <span className="text-xs font-light text-neutral-400 uppercase tracking-wider">
              {kycStatus}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
