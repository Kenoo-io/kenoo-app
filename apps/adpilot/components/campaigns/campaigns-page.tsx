"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Filter,
  ListFilter,
  Search,
  X,
} from "lucide-react";

import { cn } from "@walls/utils";

import type {
  CampaignAccountOption,
  CampaignEntityType,
  CampaignObjectiveOption,
  CampaignSortColumn,
  CampaignSortDirection,
  EntityPerformanceRow,
} from "@/lib/campaigns-server";
import type { AdCreativePreview } from "@/lib/meta-creatives";
import type { DashboardObjectiveBucket } from "@/lib/meta-objectives";
import {
  formatCompactNumber,
  formatCurrencyFromMicros,
  formatPercent,
  formatResultCount,
  formatRoas,
} from "@/lib/format-analytics";
import { formatObjectiveLabel } from "@/lib/meta-objectives";
import { formatCpaFromMicros } from "@/lib/entity-daily-progress";

import { AnimatedMetricValue } from "@/components/dashboard/animated-metric-value";
import { AdCreativeLightbox } from "@/components/campaigns/ad-creative-lightbox";
import {
  AdPilotRowBadge,
  AdThumbnail,
  EntityStatusBadge,
  LearningBadge,
} from "@/components/campaigns/entity-detail-shared";
import { useResizableColumns } from "@/components/campaigns/use-resizable-columns";
import { GoogleAdsIcon } from "@/components/settings/google-ads-icon";
import { MetaIcon } from "@/components/settings/meta-icon";
import { GOOGLE_PROVIDER, META_PROVIDER } from "@/lib/connections";
import { ENTITY_TABS } from "@/components/campaigns/campaigns-header-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 25;
const COLUMN_WIDTHS_STORAGE_KEY = "adpilot-campaigns-column-widths";

const CAMPAIGN_COLUMN_IDS = [
  "name",
  "platform",
  "context",
  "account",
  "status",
  "dailyBudget",
  "spend",
  "websitePurchases",
  "cpa",
  "purchaseValue",
  "impressions",
  "clicks",
  "ctr",
  "roas",
] as const satisfies readonly CampaignSortColumn[];

type CampaignColumnId = (typeof CAMPAIGN_COLUMN_IDS)[number];

const DEFAULT_CAMPAIGN_COLUMN_WIDTHS: Record<CampaignColumnId, number> = {
  name: 220,
  platform: 88,
  context: 160,
  account: 140,
  status: 120,
  dailyBudget: 112,
  spend: 104,
  websitePurchases: 132,
  cpa: 88,
  purchaseValue: 124,
  impressions: 112,
  clicks: 80,
  ctr: 72,
  roas: 72,
};

const TEXT_SORT_COLUMNS = new Set<CampaignColumnId>([
  "name",
  "platform",
  "context",
  "account",
  "status",
]);

const TIME_RANGE_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

type CampaignTimeRange = (typeof TIME_RANGE_OPTIONS)[number]["value"];

function columnLabel(id: CampaignColumnId, entityType: CampaignEntityType): string {
  const labels: Record<CampaignColumnId, string> = {
    name: "Name",
    platform: "Platform",
    context: entityType === "campaign" ? "Objective" : "Parent",
    account: "Account",
    status: "Status",
    dailyBudget: "Daily budget",
    spend: "Spend",
    websitePurchases: "Website purchases",
    cpa: "CPA",
    purchaseValue: "Purchase value",
    impressions: "Impressions",
    clicks: "Clicks",
    ctr: "CTR",
    roas: "ROAS",
  };
  return labels[id];
}

function PlatformCell({ provider }: { provider: string }) {
  if (provider === META_PROVIDER) {
    return (
      <span className="inline-flex items-center" title="Meta">
        <MetaIcon className="h-4 w-4 shrink-0" />
        <span className="sr-only">Meta</span>
      </span>
    );
  }

  if (provider === GOOGLE_PROVIDER) {
    return (
      <span className="inline-flex items-center" title="Google Ads">
        <GoogleAdsIcon className="h-4 w-4 shrink-0" />
        <span className="sr-only">Google Ads</span>
      </span>
    );
  }

  return (
    <span className="text-xs font-light capitalize text-neutral-500">
      {provider || "-"}
    </span>
  );
}

function ResizableHeader({
  columnId,
  label,
  width,
  indented,
  sortColumn,
  sortDirection,
  onSort,
  onResizeStart,
}: {
  columnId: CampaignColumnId;
  label: string;
  width: number;
  indented?: boolean;
  sortColumn: CampaignColumnId;
  sortDirection: CampaignSortDirection;
  onSort: (columnId: CampaignColumnId) => void;
  onResizeStart: (columnId: CampaignColumnId, startX: number) => void;
}) {
  const active = sortColumn === columnId;
  const SortIcon = !active
    ? ChevronsUpDown
    : sortDirection === "asc"
      ? ChevronUp
      : ChevronDown;

  return (
    <th
      className={cn(
        "relative bg-kenoo-white py-3 pr-4 text-left text-xs font-medium tracking-wide whitespace-nowrap text-neutral-400 uppercase select-none",
        indented && "pl-3",
      )}
      style={{ width }}
      aria-sort={
        active
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(columnId)}
        className={cn(
          "inline-flex max-w-full items-center gap-1 border-0 bg-transparent p-0 pr-3 font-medium tracking-wide uppercase transition-colors hover:text-neutral-700",
          active ? "text-neutral-700" : "text-neutral-400",
        )}
      >
        <span className="truncate">{label}</span>
        <SortIcon
          className={cn(
            "h-3 w-3 shrink-0",
            active ? "opacity-100" : "opacity-40",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      <button
        type="button"
        aria-label={`Resize ${label} column`}
        className="absolute top-1/2 right-0 z-20 h-4 w-3 -translate-y-1/2 cursor-col-resize touch-none border-none bg-transparent p-0 after:absolute after:top-1/2 after:right-1 after:h-3.5 after:w-px after:-translate-y-1/2 after:bg-neutral-200 hover:after:bg-neutral-400"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onResizeStart(columnId, event.clientX);
        }}
      />
    </th>
  );
}

function entityDetailHref(row: EntityPerformanceRow): string | null {
  if (row.entityType === "campaign") return `/campaigns/${row.id}`;
  if (row.entityType === "ad_group" && row.parentId) {
    return `/campaigns/${row.parentId}/ad-sets/${row.id}`;
  }
  return null;
}

function parentDetailHref(row: EntityPerformanceRow): string | null {
  if (row.entityType === "ad" && row.parentId && row.parentCampaignId) {
    return `/campaigns/${row.parentCampaignId}/ad-sets/${row.parentId}`;
  }
  if (row.entityType === "ad_group" && row.parentId) {
    return `/campaigns/${row.parentId}`;
  }
  return null;
}

export function CampaignsPage() {
  const searchParams = useSearchParams();
  const initialEntityType = searchParams.get("type");
  const entityType: CampaignEntityType =
    initialEntityType === "campaign" ||
    initialEntityType === "ad_group" ||
    initialEntityType === "ad_sets" ||
    initialEntityType === "ad"
      ? initialEntityType === "ad_sets"
        ? "ad_group"
        : initialEntityType
      : "campaign";
  const [rows, setRows] = React.useState<EntityPerformanceRow[]>([]);
  const [accounts, setAccounts] = React.useState<CampaignAccountOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [accountFilter, setAccountFilter] = React.useState("");
  const [accountFilterOpen, setAccountFilterOpen] = React.useState(false);
  const accountFilterRef = React.useRef<HTMLDivElement>(null);
  const [objectiveFilter, setObjectiveFilter] = React.useState<
    DashboardObjectiveBucket | ""
  >("");
  const [objectiveFilterOpen, setObjectiveFilterOpen] = React.useState(false);
  const objectiveFilterRef = React.useRef<HTMLDivElement>(null);
  const [objectives, setObjectives] = React.useState<CampaignObjectiveOption[]>(
    [],
  );
  const [timeRange, setTimeRange] = React.useState<CampaignTimeRange>("30d");
  const [timeRangeOpen, setTimeRangeOpen] = React.useState(false);
  const timeRangeRef = React.useRef<HTMLDivElement>(null);
  const [providerFilter, setProviderFilter] = React.useState<"" | "meta" | "google">("");
  const [statusFilter, setStatusFilter] = React.useState<"" | "active" | "paused">("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [creativePreview, setCreativePreview] = React.useState<{
    adName: string;
    adId: string;
    preview: AdCreativePreview;
  } | null>(null);
  const [sortColumn, setSortColumn] =
    React.useState<CampaignColumnId>("spend");
  const [sortDirection, setSortDirection] =
    React.useState<CampaignSortDirection>("desc");
  const { widths, startResize, tableMinWidth } = useResizableColumns(
    DEFAULT_CAMPAIGN_COLUMN_WIDTHS,
    COLUMN_WIDTHS_STORAGE_KEY,
  );

  const colCount = CAMPAIGN_COLUMN_IDS.length;

  const handleSort = (columnId: CampaignColumnId) => {
    if (sortColumn === columnId) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(columnId);
    setSortDirection(TEXT_SORT_COLUMNS.has(columnId) ? "asc" : "desc");
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: entityType,
        page: String(page),
        range: timeRange,
        sort: sortColumn,
        dir: sortDirection,
      });
      if (search.trim()) params.set("search", search.trim());
      if (accountFilter) params.set("accountId", accountFilter);
      if (objectiveFilter) params.set("objective", objectiveFilter);
      if (providerFilter) params.set("provider", providerFilter);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/campaigns?${params.toString()}`);
      if (!response.ok) return;

      const payload = (await response.json()) as {
        rows?: EntityPerformanceRow[];
        totalCount?: number;
        accounts?: CampaignAccountOption[];
        objectives?: CampaignObjectiveOption[];
      };

      setRows(payload.rows ?? []);
      setTotalCount(payload.totalCount ?? 0);
      setAccounts(payload.accounts ?? []);
      setObjectives(payload.objectives ?? []);
    } finally {
      setLoading(false);
    }
  }, [
    accountFilter,
    entityType,
    objectiveFilter,
    providerFilter,
    statusFilter,
    page,
    search,
    sortColumn,
    sortDirection,
    timeRange,
  ]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(0);
  }, [
    search,
    accountFilter,
    objectiveFilter,
    providerFilter,
    statusFilter,
    entityType,
    timeRange,
    sortColumn,
    sortDirection,
  ]);

  React.useEffect(() => {
    if (
      objectiveFilter &&
      !objectives.some((objective) => objective.value === objectiveFilter)
    ) {
      setObjectiveFilter("");
    }
  }, [objectiveFilter, objectives]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const selectedAccountLabel = accountFilter
    ? (accounts.find((account) => account.id === accountFilter)?.name ?? "Account")
    : "All accounts";
  const selectedObjectiveLabel = objectiveFilter
    ? (objectives.find((objective) => objective.value === objectiveFilter)
        ?.label ?? "Outcome")
    : "All outcomes";
  const selectedTimeRangeLabel =
    TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ??
    "Last 30 days";
  const activeFilterCount = [accountFilter, objectiveFilter, providerFilter, statusFilter].filter(Boolean).length + (timeRange !== "30d" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
  const resetFilters = () => {
    setAccountFilter("");
    setObjectiveFilter("");
    setProviderFilter("");
    setStatusFilter("");
    setTimeRange("30d");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-kenoo-white">
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-8 pb-6 md:px-10 md:pt-10">
        <div className="mb-5 flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label="Open campaign filters"
            aria-expanded={filtersOpen}
            className={cn(
              "group relative flex h-10 w-10 shrink-0 items-center justify-center text-neutral-500 outline-none",
              hasActiveFilters && "text-neutral-900",
          )}
          >
            <span className="relative flex items-center justify-center rounded-full p-3 transition-colors group-hover:bg-neutral-100">
              <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center overflow-visible">
                <ListFilter className="h-[18px] w-[18px]" strokeWidth={1.5} />
                {hasActiveFilters ? (
                  <span
                    className="pointer-events-none absolute -right-px -top-px z-20 h-1.5 w-1.5 rounded-full bg-[var(--kenoo-sky)] ring-[1.5px] ring-white"
                    aria-hidden="true"
                  />
                ) : null}
              </span>
            </span>
          </button>

          <div className="relative min-w-0 max-w-sm flex-1">
            <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name, account, status…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={cn(
                "w-full rounded-none border-0 border-b bg-transparent py-2 pl-6 pr-3 text-sm font-light transition-colors placeholder:text-neutral-300 focus:outline-none",
                search ? "border-b-[var(--kenoo-sky)]" : "border-neutral-200",
                "focus:border-b-[var(--kenoo-sky)]",
              )}
            />
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-light text-neutral-400 transition-colors hover:text-neutral-800"
            >
              Clear {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
            </button>
          ) : null}

          {filtersOpen ? (
            <>
              <button
                type="button"
                aria-label="Close campaign filters"
                onClick={() => setFiltersOpen(false)}
                className="fixed inset-0 z-[9998] cursor-default bg-black/10"
              />
              <motion.aside
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-y-0 left-0 z-[9999] flex w-80 flex-col border-r border-white/30 bg-white/90 shadow-2xl backdrop-blur-xl"
                aria-label="Campaign filters"
              >
                <div className="flex items-center justify-between border-b border-black/10 p-6">
                  <div className="flex items-center gap-3">
                    <Filter className="h-5 w-5 text-black" strokeWidth={1.5} />
                    <div>
                      <h2 className="text-lg font-semibold text-black">Filters</h2>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="text-black transition-opacity hover:opacity-60">
                    <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="space-y-6">
                    <div>
                      <Select value={accountFilter || "all"} onValueChange={(value) => setAccountFilter(value === "all" ? "" : value)}>
                        <SelectTrigger className="h-11 rounded-full border border-transparent bg-transparent px-4 text-sm font-light text-neutral-700 transition-all duration-300 hover:bg-neutral-100 focus:ring-0 focus-visible:ring-0">
                          <span><span className="text-neutral-700">Account:</span> {selectedAccountLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All accounts</SelectItem>
                          {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Select value={objectiveFilter || "all"} onValueChange={(value) => setObjectiveFilter(value === "all" ? "" : value as DashboardObjectiveBucket)}>
                        <SelectTrigger className="h-11 rounded-full border border-transparent bg-transparent px-4 text-sm font-light text-neutral-700 transition-all duration-300 hover:bg-neutral-100 focus:ring-0 focus-visible:ring-0">
                          <span><span className="text-neutral-700">Outcome:</span> {selectedObjectiveLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All outcomes</SelectItem>
                          {objectives.map((objective) => <SelectItem key={objective.value} value={objective.value}>{objective.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Select value={timeRange} onValueChange={(value) => setTimeRange(value as CampaignTimeRange)}>
                        <SelectTrigger className="h-11 rounded-full border border-transparent bg-transparent px-4 text-sm font-light text-neutral-700 transition-all duration-300 hover:bg-neutral-100 focus:ring-0 focus-visible:ring-0">
                          <span><span className="text-neutral-700">Date range:</span> {selectedTimeRangeLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_RANGE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-medium tracking-[0.16em] text-neutral-400 uppercase">Platform</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "", label: "All", icon: null },
                          { value: "meta", label: "Meta", icon: <MetaIcon className="h-4 w-4" /> },
                          { value: "google", label: "Google", icon: <GoogleAdsIcon className="h-4 w-4" /> },
                        ].map((option) => (
                          <button key={option.value} type="button" onClick={() => setProviderFilter(option.value as "" | "meta" | "google")} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-light transition-colors", providerFilter === option.value ? "border-[var(--kenoo-sky)] bg-[var(--kenoo-sky)]/10 text-neutral-900" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50")}>
                            {option.icon}
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-medium tracking-[0.16em] text-neutral-400 uppercase">Delivery status</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "paused", label: "Paused" }].map((option) => (
                          <button key={option.value} type="button" onClick={() => setStatusFilter(option.value as "" | "active" | "paused")} className={cn("rounded-lg border px-2 py-2 text-xs font-light transition-colors", statusFilter === option.value ? "border-[var(--kenoo-sky)] bg-[var(--kenoo-sky)]/10 text-neutral-900" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50")}>{option.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-black/10 p-6">
                  <button type="button" onClick={resetFilters} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-light text-neutral-700 transition-colors hover:bg-neutral-100">Reset filters</button>
                  <button type="button" onClick={() => setFiltersOpen(false)} className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100">Done</button>
                </div>
              </motion.aside>
            </>
          ) : null}

          {!loading && totalCount > 0 ? (
            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} aria-label="Previous page" className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[7.5rem] text-center text-xs font-light whitespace-nowrap text-neutral-400 tabular-nums">Page {page + 1} of {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} aria-label="Next page" className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          ) : null}
        </div>

        <div className="hidden">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
            <div className="relative min-w-0 max-w-sm flex-1">
              <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, account, status…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={cn(
                  "w-full rounded-none border-0 border-b bg-transparent py-2 pl-6 pr-3 text-sm font-light transition-colors placeholder:text-neutral-300 focus:outline-none",
                  search ? "border-b-[var(--kenoo-sky)]" : "border-neutral-200",
                  "focus:border-b-[var(--kenoo-sky)]",
                )}
              />
            </div>

            {accounts.length > 0 ? (
              <div className="relative flex-shrink-0" ref={accountFilterRef}>
                <button
                  type="button"
                  onClick={() => setAccountFilterOpen((open) => !open)}
                  className={cn(
                    "inline-flex max-w-[min(100%,18rem)] min-w-0 items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-sm font-light uppercase tracking-wider text-neutral-700 shadow-none transition-colors hover:text-neutral-900",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
                  )}
                  aria-expanded={accountFilterOpen}
                  aria-haspopup="listbox"
                >
                  {accountFilter ? (
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--kenoo-sky)]"
                      aria-hidden
                    />
                  ) : null}
                  <span className="truncate">{selectedAccountLabel}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 flex-shrink-0 text-neutral-500 transition-transform duration-200",
                      accountFilterOpen && "rotate-180",
                    )}
                    strokeWidth={1.8}
                  />
                </button>

                {accountFilterOpen ? (
                  <div
                    className="absolute top-full left-0 z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                    role="listbox"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={accountFilter === ""}
                      onClick={() => {
                        setAccountFilter("");
                        setAccountFilterOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                        accountFilter === ""
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-700 hover:bg-neutral-50",
                      )}
                    >
                      <span className="flex w-2 flex-shrink-0 justify-center" aria-hidden>
                        <span className="h-2 w-2 rounded-full bg-neutral-300" />
                      </span>
                      <span>All accounts</span>
                    </button>
                    <div className="mt-1 border-t border-neutral-100 pt-1">
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          role="option"
                          aria-selected={accountFilter === account.id}
                          onClick={() => {
                            setAccountFilter(account.id);
                            setAccountFilterOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                            accountFilter === account.id
                              ? "bg-neutral-100 text-neutral-900"
                              : "text-neutral-700 hover:bg-neutral-50",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 flex-shrink-0 rounded-full",
                              accountFilter === account.id
                                ? "bg-[var(--kenoo-sky)]"
                                : "bg-neutral-200",
                            )}
                            aria-hidden
                          />
                          <span className="truncate">{account.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {objectives.length > 0 ? (
              <div className="relative flex-shrink-0" ref={objectiveFilterRef}>
                <button
                  type="button"
                  onClick={() => setObjectiveFilterOpen((open) => !open)}
                  className={cn(
                    "inline-flex max-w-[min(100%,18rem)] min-w-0 items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-sm font-light uppercase tracking-wider text-neutral-700 shadow-none transition-colors hover:text-neutral-900",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
                  )}
                  aria-expanded={objectiveFilterOpen}
                  aria-haspopup="listbox"
                >
                  {objectiveFilter ? (
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--kenoo-sky)]"
                      aria-hidden
                    />
                  ) : null}
                  <span className="truncate">{selectedObjectiveLabel}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 flex-shrink-0 text-neutral-500 transition-transform duration-200",
                      objectiveFilterOpen && "rotate-180",
                    )}
                    strokeWidth={1.8}
                  />
                </button>

                {objectiveFilterOpen ? (
                  <div
                    className="absolute top-full left-0 z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                    role="listbox"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={objectiveFilter === ""}
                      onClick={() => {
                        setObjectiveFilter("");
                        setObjectiveFilterOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                        objectiveFilter === ""
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-700 hover:bg-neutral-50",
                      )}
                    >
                      <span className="flex w-2 flex-shrink-0 justify-center" aria-hidden>
                        <span className="h-2 w-2 rounded-full bg-neutral-300" />
                      </span>
                      <span>All outcomes</span>
                    </button>
                    <div className="mt-1 border-t border-neutral-100 pt-1">
                      {objectives.map((objective) => (
                        <button
                          key={objective.value}
                          type="button"
                          role="option"
                          aria-selected={objectiveFilter === objective.value}
                          onClick={() => {
                            setObjectiveFilter(objective.value);
                            setObjectiveFilterOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                            objectiveFilter === objective.value
                              ? "bg-neutral-100 text-neutral-900"
                              : "text-neutral-700 hover:bg-neutral-50",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 flex-shrink-0 rounded-full",
                              objectiveFilter === objective.value
                                ? "bg-[var(--kenoo-sky)]"
                                : "bg-neutral-200",
                            )}
                            aria-hidden
                          />
                          <span className="truncate">{objective.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="relative flex-shrink-0" ref={timeRangeRef}>
              <button
                type="button"
                onClick={() => setTimeRangeOpen((open) => !open)}
                className={cn(
                  "inline-flex max-w-[min(100%,18rem)] min-w-0 items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-sm font-light uppercase tracking-wider text-neutral-700 shadow-none transition-colors hover:text-neutral-900",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
                )}
                aria-expanded={timeRangeOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate">{selectedTimeRangeLabel}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0 text-neutral-500 transition-transform duration-200",
                    timeRangeOpen && "rotate-180",
                  )}
                  strokeWidth={1.8}
                />
              </button>

              {timeRangeOpen ? (
                <div
                  className="absolute top-full left-0 z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                  role="listbox"
                >
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={timeRange === option.value}
                      onClick={() => {
                        setTimeRange(option.value);
                        setTimeRangeOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                        timeRange === option.value
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-700 hover:bg-neutral-50",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 flex-shrink-0 rounded-full",
                          timeRange === option.value
                            ? "bg-[var(--kenoo-sky)]"
                            : "bg-neutral-200",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {!loading && totalCount > 0 ? (
            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                aria-label="Previous page"
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[7.5rem] text-center text-xs font-light whitespace-nowrap text-neutral-400 tabular-nums">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages - 1, current + 1))
                }
                disabled={page >= totalPages - 1}
                aria-label="Next page"
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto scrollbar-hide">
          <table
            className="w-full table-fixed text-sm"
            style={{ minWidth: tableMinWidth }}
          >
            <colgroup>
              {CAMPAIGN_COLUMN_IDS.map((columnId) => (
                <col key={columnId} style={{ width: widths[columnId] }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-neutral-100 bg-kenoo-white">
              <tr>
                {CAMPAIGN_COLUMN_IDS.map((columnId, index) => (
                  <ResizableHeader
                    key={columnId}
                    columnId={columnId}
                    label={columnLabel(columnId, entityType)}
                    width={widths[columnId]}
                    indented={index > 0}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    onResizeStart={startResize}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-neutral-50">
                    {Array.from({ length: colCount }).map((__, colIndex) => (
                      <td key={colIndex} className="py-4 pr-4">
                        <div className="h-4 animate-pulse rounded bg-neutral-200/80" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="py-16 text-center text-sm font-light text-neutral-400"
                  >
                    {accounts.length === 0
                      ? "Connect Meta or Google Ads in Settings to sync campaigns and ads."
                      : `No ${ENTITY_TABS.find((tab) => tab.value === entityType)?.label.toLowerCase()} found.`}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const detailHref = entityDetailHref(row);
                  const parentHref = parentDetailHref(row);
                  return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.015 }}
                    className="border-b border-neutral-50 transition-colors hover:bg-neutral-50/60"
                  >
                    <td className="overflow-hidden py-4 pr-4">
                      <div className="flex min-w-0 items-center gap-2">
                        {entityType === "ad" ? (
                          <AdThumbnail
                            url={row.thumbnailUrl}
                            title={row.name}
                            creativeType={row.creativeType}
                            onClick={
                              row.creativePreview
                                ? () =>
                                    setCreativePreview({
                                      adName: row.name,
                                      adId: row.id,
                                      preview: row.creativePreview!,
                                    })
                                : undefined
                            }
                          />
                        ) : null}
                        {detailHref ? (
                          <Link
                            href={detailHref}
                            className="truncate text-sm font-medium text-neutral-800 transition-colors hover:text-[var(--kenoo-sky)]"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-medium text-neutral-800">
                            {row.name}
                          </span>
                        )}
                        {row.adpilotEnabled ? (
                          <AdPilotRowBadge
                            title={`AdPilot ${row.automationStatus ?? "active"}`}
                          />
                        ) : null}
                        <LearningBadge status={row.learningStatus} />
                      </div>
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3">
                      <PlatformCell provider={row.provider} />
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light text-neutral-500">
                      <span className="block truncate">
                        {entityType === "campaign" ? (
                          formatObjectiveLabel(row.objective)
                        ) : parentHref ? (
                          <Link
                            href={parentHref}
                            className="transition-colors hover:text-[var(--kenoo-sky)]"
                          >
                            {row.parentName ?? "-"}
                          </Link>
                        ) : (
                          (row.parentName ?? "-")
                        )}
                      </span>
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500">
                      <span className="block truncate">{row.accountName}</span>
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3">
                      {row.entityType === "campaign" ||
                      row.entityType === "ad_group" ? (
                        <EntityStatusBadge
                          status={row.status}
                          entityId={row.id}
                          onStatusChange={(status) =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, status } : item,
                              ),
                            )
                          }
                        />
                      ) : (
                        <EntityStatusBadge status={row.status} />
                      )}
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500 tabular-nums">
                      <AnimatedMetricValue
                        value={
                          row.dailyBudgetMicros != null && row.dailyBudgetMicros > 0
                            ? formatCurrencyFromMicros(row.dailyBudgetMicros)
                            : "-"
                        }
                      />
                      {row.dailyBudgetInherited ? (
                        <span className="mt-0.5 block text-[10px] font-light tracking-wide text-neutral-400 uppercase">
                          Campaign
                        </span>
                      ) : null}
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-medium whitespace-nowrap text-neutral-800 tabular-nums">
                      <AnimatedMetricValue
                        value={formatCurrencyFromMicros(row.spendMicros)}
                      />
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500 tabular-nums">
                      <AnimatedMetricValue
                        value={
                          row.websitePurchases === null
                            ? "-"
                            : formatResultCount(row.websitePurchases)
                        }
                      />
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500 tabular-nums">
                      <AnimatedMetricValue
                        value={
                          row.websitePurchases === null
                            ? "-"
                            : formatCpaFromMicros(row.spendMicros, row.websitePurchases)
                        }
                      />
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500 tabular-nums">
                      <AnimatedMetricValue
                        value={
                          row.conversionValueMicros > 0
                            ? formatCurrencyFromMicros(row.conversionValueMicros)
                            : "-"
                        }
                      />
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500 tabular-nums">
                      <AnimatedMetricValue
                        value={formatCompactNumber(row.impressions)}
                      />
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500 tabular-nums">
                      <AnimatedMetricValue value={String(row.clicks)} />
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500 tabular-nums">
                      <AnimatedMetricValue value={formatPercent(row.ctr)} />
                    </td>
                    <td className="overflow-hidden py-4 pr-4 pl-3 text-xs font-light whitespace-nowrap text-neutral-500 tabular-nums">
                      {formatRoas(row.roas)}
                    </td>
                  </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <AdCreativeLightbox
        open={creativePreview != null}
        onClose={() => setCreativePreview(null)}
        adName={creativePreview?.adName ?? ""}
        adId={creativePreview?.adId ?? null}
        preview={creativePreview?.preview ?? null}
      />
    </div>
  );
}
