"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from '@walls/auth';
import { getSupabaseClient } from '@walls/auth';
import { LedgerHeader } from "../ledger-header";
import { RecipientCard, RecipientRow } from "./recipient-card";
import { CRMSkeleton } from "@/components/ui/crm-skeleton";
import { LedgerTableToolbar } from "../index/table/ledger-table-toolbar";
import { LedgerPagination } from "../index/table/ledger-pagination";
import { LedgerFilters } from "../index/types";
import { Users } from "lucide-react";

const ITEMS_PER_PAGE = 25;
const SEARCH_DEBOUNCE_MS = 400;

interface AgentsLedgerRecipientsProps {
  analyticsData?: unknown;
}

function AgentsLedgerRecipientsContent({
  analyticsData: _analyticsData,
}: AgentsLedgerRecipientsProps) {
  const { user } = useAuth();

  // ─── Recipients data ──────────────────────────────────────────────────────
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [filters, setFilters] = useState<LedgerFilters>({
    searchTerm: "",
    type: "",
    status: "",
    source: "",
    dateFrom: "",
    dateTo: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filters.searchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch recipients
  useEffect(() => {
    if (!user) {
      setRecipients([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const supabase = getSupabaseClient();
        let query = supabase
          .from("wise_recipients")
          .select(
            "id, wise_recipient_id, recipient_name, payout_currency, payout_country, payout_type, legal_type, bank_details, can_receive_payments, kyc_status, contact_email",
            { count: "exact" }
          )
          .order("recipient_name", { ascending: true });

        if (debouncedSearch) {
          query = query.ilike("recipient_name", `%${debouncedSearch}%`);
        }

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        const { data, error, count } = await query.range(from, to);

        if (error) throw new Error(error.message);
        if (!cancelled) {
          setRecipients((Array.isArray(data) ? data : []) as RecipientRow[]);
          setTotalCount(count ?? 0);
          setTotalPages(Math.max(1, Math.ceil((count ?? 0) / ITEMS_PER_PAGE)));
        }
      } catch {
        if (!cancelled) {
          setRecipients([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, currentPage, debouncedSearch, refreshTrigger]);

  const handleFilterChange = (key: keyof LedgerFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 w-full flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overscroll-none pl-8 pr-4 md:pr-6">
          {/* Shared header (Recipients icon active) */}
          <LedgerHeader />

          {/* Hero: total count */}
          <div className="pt-6 pb-6 flex flex-col items-center justify-center">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl md:text-6xl lg:text-7xl font-black text-neutral-900 tracking-tight tabular-nums">
                {totalCount}
              </span>
              <span className="font-light text-neutral-500 uppercase tracking-wider text-sm">
                Recipients
              </span>
            </div>
            <span className="mt-1 font-light text-neutral-500 uppercase tracking-wider text-sm">
              Registered in WISE
            </span>
          </div>

          {/* Page title */}
          <div className="pb-2">
            <h1 className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tight uppercase">
              Recipients
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Payout recipients registered in your WISE account.
            </p>
          </div>

          <LedgerTableToolbar
            filters={filters}
            onFilterChange={handleFilterChange}
            onFilterToggle={() => {}}
            onRefresh={() => setRefreshTrigger((r) => r + 1)}
            onExport={() => {}}
          />

          {/* Recipients list */}
          <div className="flex flex-col gap-3 mt-4 pb-8">
            {loading ? (
              <div className="flex flex-col gap-3">
                <CRMSkeleton count={4} />
              </div>
            ) : recipients.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[240px] text-center px-4">
                <div className="w-16 h-16 rounded-full bg-neutral-200/80 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-neutral-400" />
                </div>
                <p className="text-neutral-600 font-medium">No recipients found</p>
                <p className="text-sm text-neutral-500 mt-1 max-w-sm">
                  Recipients will appear after background sync picks up your WISE account data.
                </p>
              </div>
            ) : (
              <>
                {recipients.map((recipient, index) => (
                  <RecipientCard
                    key={recipient.id}
                    recipient={recipient}
                    index={index}
                  />
                ))}

                {totalPages > 1 && (
                  <div className="mt-6">
                    <LedgerPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentsLedgerRecipients(
  props: AgentsLedgerRecipientsProps
) {
  return <AgentsLedgerRecipientsContent {...props} />;
}
