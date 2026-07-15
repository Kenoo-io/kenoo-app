"use client";

import * as React from "react";
import { ChevronDown, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { selectTriggerClass } from "../tabs/invoiceTab/invoice-tab-styles";

/** Picked row: `id` is `wise_transactions.id` (used as `invoice_payments.transaction_id`). */
export type WiseTransactionPick = {
  id: string;
  wise_transaction_id: string;
  amount: number | null;
  currency: string | null;
  wise_created_at: string | null;
  type: string | null;
  merchant_name: string | null;
};

const SEARCH_DEBOUNCE_MS = 280;
const LIST_LIMIT = 50;

const SKELETON_KEYS = ["a", "b", "c", "d", "e"] as const;

function ListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {SKELETON_KEYS.map((k, i) => (
        <div
          key={k}
          className="flex flex-col gap-2 rounded-xl border border-neutral-200/40 bg-white/50 px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-sm"
        >
          <Skeleton className="h-3.5 w-[72%] rounded-md bg-neutral-200/80" style={{ animationDelay: `${i * 70}ms` }} />
          <Skeleton className="h-2.5 w-[45%] rounded-md bg-neutral-200/60" style={{ animationDelay: `${i * 70 + 40}ms` }} />
        </div>
      ))}
    </div>
  );
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";
  const cur = (currency && String(currency).trim().slice(0, 3).toUpperCase()) || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${Number(amount).toFixed(2)} ${cur}`;
  }
}

function formatWhen(iso: string | null | undefined): string {
  const s = iso != null ? String(iso).trim() : "";
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : `${s.split("T")[0]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function summarizeRow(r: WiseTransactionPick): string {
  const title = (r.merchant_name && String(r.merchant_name).trim()) || (r.type && String(r.type).trim()) || "Wise transaction";
  const money = formatMoney(r.amount, r.currency);
  const when = formatWhen(r.wise_created_at);
  return `${title} · ${money} · ${when}`;
}

interface WiseTransactionSearchProps {
  /** `wise_transactions.id` (UUID) for the selected row. */
  value: string;
  onSelect: (row: WiseTransactionPick) => void;
  className?: string;
  disabled?: boolean;
  /** Other rows' `wise_transactions.id` values to hide from the list. */
  excludeWiseRowIds?: string[];
}

export function WiseTransactionSearch({
  value,
  onSelect,
  className,
  disabled,
  excludeWiseRowIds = [],
}: WiseTransactionSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<WiseTransactionPick[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [listLoading, setListLoading] = React.useState(false);
  const [selectedFromDb, setSelectedFromDb] = React.useState<WiseTransactionPick | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const excludeKey = React.useMemo(
    () =>
      [...excludeWiseRowIds]
        .map((id) => String(id).trim())
        .filter(Boolean)
        .sort()
        .join("|"),
    [excludeWiseRowIds.join("|")]
  );

  const debouncePending = open && searchTerm.trim() !== debouncedSearch;
  const showListSkeleton = listLoading || (debouncePending && rows.length === 0);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  React.useEffect(() => {
    const run = async () => {
      if (!open) return;
      setListLoading(true);
      try {
        const supabase = getSupabaseClient();
        let query = supabase
          .from("wise_transactions")
          .select("id, wise_transaction_id, amount, currency, wise_created_at, type, merchant_name")
          .order("wise_created_at", { ascending: false })
          .limit(LIST_LIMIT);

        const q = debouncedSearch.trim();
        if (q) {
          const pattern = `%${q.replace(/,/g, " ")}%`;
          const uuidLike =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
          query = query.or(
            uuidLike
              ? `id.eq.${q},wise_transaction_id.ilike.${pattern},merchant_name.ilike.${pattern},type.ilike.${pattern},currency.ilike.${pattern}`
              : `wise_transaction_id.ilike.${pattern},merchant_name.ilike.${pattern},type.ilike.${pattern},currency.ilike.${pattern}`
          );
        }

        const { data, error } = await query;
        if (error) {
          console.error("[WiseTransactionSearch]", error);
          setRows([]);
          return;
        }
        const excludeSet = new Set(excludeKey.split("|").filter(Boolean));
        const list = (data ?? []).map((r: any) => ({
          id: String(r.id ?? ""),
          wise_transaction_id: String(r.wise_transaction_id ?? ""),
          amount: r.amount != null ? Number(r.amount) : null,
          currency: r.currency != null ? String(r.currency) : null,
          wise_created_at: r.wise_created_at != null ? String(r.wise_created_at) : null,
          type: r.type != null ? String(r.type) : null,
          merchant_name: r.merchant_name != null ? String(r.merchant_name) : null,
        })) as WiseTransactionPick[];

        setRows(list.filter((r) => r.id && !excludeSet.has(r.id)));
      } catch (e) {
        console.error("[WiseTransactionSearch]", e);
        setRows([]);
      } finally {
        setListLoading(false);
      }
    };
    void run();
  }, [open, debouncedSearch, excludeKey]);

  React.useEffect(() => {
    const load = async () => {
      const id = value.trim();
      if (!id) {
        setSelectedFromDb(null);
        return;
      }
      const inList = rows.some((r) => r.id === id);
      if (inList) {
        setSelectedFromDb(null);
        return;
      }
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("wise_transactions")
          .select("id, wise_transaction_id, amount, currency, wise_created_at, type, merchant_name")
          .eq("id", id)
          .maybeSingle();
        if (error || !data?.id) {
          setSelectedFromDb(null);
          return;
        }
        setSelectedFromDb({
          id: String(data.id),
          wise_transaction_id: String(data.wise_transaction_id ?? ""),
          amount: data.amount != null ? Number(data.amount) : null,
          currency: data.currency != null ? String(data.currency) : null,
          wise_created_at: data.wise_created_at != null ? String(data.wise_created_at) : null,
          type: data.type != null ? String(data.type) : null,
          merchant_name: data.merchant_name != null ? String(data.merchant_name) : null,
        });
      } catch {
        setSelectedFromDb(null);
      }
    };
    void load();
  }, [value, rows]);

  const selectedRow = React.useMemo(() => {
    const id = value.trim();
    if (!id) return null;
    return rows.find((r) => r.id === id) ?? selectedFromDb;
  }, [rows, value, selectedFromDb]);

  const handleSelect = (row: WiseTransactionPick) => {
    onSelect(row);
    setOpen(false);
    setSearchTerm("");
  };

  const triggerLabel = selectedRow ? summarizeRow(selectedRow) : value.trim() || "Search Wise transactions…";

  return (
    <div className={cn("w-full min-w-0", className)}>
      <Select
        value=""
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setSearchTerm("");
            setListLoading(false);
          } else {
            setListLoading(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        onValueChange={() => {}}
      >
        <SelectTrigger
          disabled={disabled}
          className={cn(
            "relative h-auto min-h-8 w-full max-w-full border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>:last-child]:hidden",
            selectTriggerClass
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 pr-1 text-left">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-light",
                !selectedRow && !value.trim() && "text-neutral-400"
              )}
            >
              {triggerLabel}
            </span>
          </div>
          <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="flex max-h-[min(420px,70vh)] w-[min(100vw-2rem,26rem)] max-w-[min(100vw-2rem,26rem)] flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white/95 p-0 shadow-2xl !z-[9999] [&>div]:!h-auto [&>div]:!min-w-0 [&>div]:!p-0"
        >
          <div className="sticky top-0 z-10 flex-shrink-0 border-b border-neutral-200/60 bg-white/90 p-2 backdrop-blur-md">
            <div className={cn("rounded-2xl border border-neutral-200/50 bg-neutral-100 py-2 pl-2 pr-3 shadow-inner backdrop-blur-md")}>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchTerm(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") setSearchTerm("");
                }}
                placeholder="Merchant, type, currency, row id, or Wise ref…"
                className="w-full flex-1 border-0 bg-transparent text-sm font-light placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto bg-neutral-50/80 backdrop-blur-sm"
            onWheel={(e) => e.stopPropagation()}
          >
            {showListSkeleton ? (
              <ListSkeleton />
            ) : rows.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm font-light text-neutral-500">
                {debouncedSearch.trim()
                  ? "No transactions match. Sync Wise from the ledger tools, or try another search."
                  : "No transactions found. Sync Wise to populate `wise_transactions`."}
              </div>
            ) : (
              rows.map((row) => {
                const active = value.trim() === row.id;
                const title =
                  (row.merchant_name && String(row.merchant_name).trim()) ||
                  (row.type && String(row.type).trim()) ||
                  "Transaction";
                return (
                  <div
                    key={row.id}
                    role="option"
                    aria-selected={active}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(row);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className={cn(
                      "cursor-pointer border-b border-neutral-100/80 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-neutral-100/90",
                      active && "bg-amber-100/50"
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-light text-neutral-900">{title}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-500">{row.wise_transaction_id}</p>
                        <p className="mt-1 text-xs font-light text-neutral-600">
                          {formatMoney(row.amount, row.currency)} · {formatWhen(row.wise_created_at)}
                          {row.type ? ` · ${row.type}` : ""}
                        </p>
                      </div>
                      {active ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-800" /> : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
