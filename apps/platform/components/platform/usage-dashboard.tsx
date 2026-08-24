"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Download,
  RefreshCw,
  Settings,
} from "lucide-react";

import { kenooColors } from "@walls/ui/colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";

import { formatUsdFromCents } from "@/lib/money";

export type UsageEventRow = {
  id: string;
  created_at: string;
  amount_cents: number;
  status: string;
  request_id: string | null;
  api_key_id: string | null;
  units: number;
  productName: string;
  keyName: string | null;
};

export type UsageKeyOption = {
  id: string;
  name: string;
};

type RangeId = "7d" | "30d" | "month";

const RANGE_OPTIONS: { id: RangeId; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
];

const SKY = kenooColors.sky.DEFAULT;

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function rangeStart(range: RangeId): Date {
  const now = startOfUtcDay(new Date());
  if (range === "7d") return addUtcDays(now, -6);
  if (range === "30d") return addUtcDays(now, -29);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function eachUtcDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  for (let cursor = new Date(from); cursor <= to; cursor = addUtcDays(cursor, 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

function formatAxisDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTooltipDate(date: Date): string {
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })} UTC`;
}

function toCsv(rows: UsageEventRow[]): string {
  const header = ["time", "product", "amount_usd", "status", "api_key", "request_id"];
  const lines = rows.map((row) =>
    [
      row.created_at,
      row.productName,
      (row.amount_cents / 100).toFixed(4),
      row.status,
      row.keyName ?? "",
      row.request_id ?? "",
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function UsageDashboard({
  events,
  keys,
  accountName,
  monthSpendCents,
  monthLimitCents,
  monthLabel,
}: {
  events: UsageEventRow[];
  keys: UsageKeyOption[];
  accountName: string;
  monthSpendCents: number;
  monthLimitCents: number | null;
  monthLabel: string;
}) {
  const router = useRouter();
  const [range, setRange] = useState<RangeId>("7d");
  const [keyId, setKeyId] = useState<string>("all");
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const from = rangeStart(range).getTime();
    return events.filter((event) => {
      if (new Date(event.created_at).getTime() < from) return false;
      if (keyId !== "all" && event.api_key_id !== keyId) return false;
      return event.status === "success";
    });
  }, [events, keyId, range]);

  const days = useMemo(() => {
    const from = rangeStart(range);
    const to = startOfUtcDay(new Date());
    const buckets = new Map<string, number>();
    for (const event of filtered) {
      const day = startOfUtcDay(new Date(event.created_at)).toISOString();
      buckets.set(day, (buckets.get(day) ?? 0) + event.amount_cents);
    }
    return eachUtcDay(from, to).map((date) => {
      const iso = date.toISOString();
      return { date, iso, cents: buckets.get(iso) ?? 0 };
    });
  }, [filtered, range]);

  const totalCents = filtered.reduce((sum, event) => sum + event.amount_cents, 0);
  const requestCount = filtered.length;
  const maxCents = Math.max(...days.map((day) => day.cents), 1);
  const avgCents = days.length ? Math.round(totalCents / days.length) : 0;
  const selectedKey = keys.find((key) => key.id === keyId);
  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.id === range)?.label ?? "Last 7 days";

  const products = useMemo(() => {
    const map = new Map<string, { name: string; cents: number; requests: number }>();
    for (const event of filtered) {
      const current = map.get(event.productName) ?? {
        name: event.productName,
        cents: 0,
        requests: 0,
      };
      current.cents += event.amount_cents;
      current.requests += 1;
      map.set(event.productName, current);
    }
    return [...map.values()].sort((left, right) => right.cents - left.cents);
  }, [filtered]);

  const keyBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; cents: number; requests: number }>();
    for (const event of filtered) {
      const name = event.keyName ?? "Unknown key";
      const current = map.get(name) ?? { name, cents: 0, requests: 0 };
      current.cents += event.amount_cents;
      current.requests += 1;
      map.set(name, current);
    }
    return [...map.values()].sort((left, right) => right.cents - left.cents);
  }, [filtered]);

  const limitCents = monthLimitCents && monthLimitCents > 0 ? monthLimitCents : null;
  const spendRatio = limitCents
    ? Math.min(100, (monthSpendCents / limitCents) * 100)
    : 0;

  function downloadCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `platform-usage-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex w-full flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-950">
          Usage
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip>
            {accountName}
          </FilterChip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={filterButtonClass}>
                {selectedKey?.name ?? "All API keys"}
                <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[80] min-w-[200px]">
              <DropdownMenuItem onClick={() => setKeyId("all")}>
                All API keys
              </DropdownMenuItem>
              {keys.map((key) => (
                <DropdownMenuItem key={key.id} onClick={() => setKeyId(key.id)}>
                  {key.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={filterButtonClass}>
                <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
                {rangeLabel}
                <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {RANGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => setRange(option.id)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            title="Refresh"
            onClick={() => router.refresh()}
            className={iconButtonClass}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Download CSV"
            onClick={downloadCsv}
            className={iconButtonClass}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">Total Spend</p>
              <p className="mt-1 text-[34px] font-semibold tracking-tight text-neutral-950">
                {formatUsdFromCents(totalCents)}
              </p>
              <p className="mt-1 text-sm font-medium" style={{ color: SKY }}>
                {formatUsdFromCents(avgCents)} avg / day
              </p>
            </div>
            <span className="inline-flex h-8 items-center rounded-md border border-neutral-200 bg-kenoo-white px-2.5 text-xs font-medium text-neutral-600">
              1d
            </span>
          </div>

          <div className="relative mt-6 h-[220px]">
            {avgCents > 0 ? (
              <div
                className="pointer-events-none absolute inset-x-0 border-t border-dashed"
                style={{
                  borderColor: SKY,
                  bottom: `${(avgCents / maxCents) * 100}%`,
                }}
              />
            ) : null}
            <div
              className="flex h-full items-end gap-[3px]"
              onMouseLeave={() => setHoveredDay(null)}
            >
              {days.map((day) => {
                const height = (day.cents / maxCents) * 100;
                const active = hoveredDay === day.iso;
                return (
                  <div
                    key={day.iso}
                    className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
                    onMouseEnter={() => setHoveredDay(day.iso)}
                  >
                    {active ? (
                      <div className="absolute inset-0 bg-neutral-100/80" />
                    ) : null}
                    <div
                      className="relative w-full rounded-sm"
                      style={{
                        height: `${Math.max(height, day.cents > 0 ? 4 : 0)}%`,
                        backgroundColor: SKY,
                        opacity: active || !hoveredDay ? 1 : 0.55,
                      }}
                    />
                    {active ? (
                      <div className="absolute bottom-[calc(100%+10px)] left-1/2 z-10 w-max -translate-x-1/2 rounded-lg border border-neutral-200 bg-kenoo-white px-3 py-2 text-left shadow-lg">
                        <p className="text-xs text-neutral-500">
                          {formatTooltipDate(day.date)}
                        </p>
                        <p className="mt-1.5 flex items-center gap-2 text-sm text-neutral-900">
                          <span
                            className="h-2.5 w-2.5 rounded-[2px]"
                            style={{ backgroundColor: SKY }}
                          />
                          all
                          <span className="font-medium">
                            {formatUsdFromCents(day.cents)}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-neutral-400">
            <span>{days[0] ? formatAxisDate(days[0].date) : ""}</span>
            <span>
              {days.length ? formatAxisDate(days[days.length - 1].date) : ""}
            </span>
          </div>
        </section>

        <aside className="flex flex-col gap-8">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-900">{monthLabel}</p>
              <Link
                href="/limits"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Budget settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-1 text-sm text-neutral-500">{accountName}</p>
            <p className="mt-1 text-sm text-neutral-700">
              {formatUsdFromCents(monthSpendCents)}
              <span className="text-neutral-400">
                {" "}
                / {limitCents ? formatUsdFromCents(limitCents) : "No limit"}
              </span>
            </p>
            <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-kenoo-emerald"
                style={{ width: `${limitCents ? spendRatio : Math.min(100, monthSpendCents ? 8 : 0)}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-900">Total requests</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              {requestCount.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Successful calls in this range
            </p>
          </div>
        </aside>
      </div>

      <div className="grid gap-10 border-t border-neutral-200 pt-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <p className="border-b border-neutral-200 pb-3 text-sm font-medium text-neutral-950">
            Products
          </p>
          {products.length === 0 ? (
            <p className="py-10 text-sm text-neutral-500">
              No usage in this range. Call a live product with your API key to
              see spend here.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <div
                  key={product.name}
                  className="rounded-xl border border-neutral-200 bg-kenoo-white px-4 py-4"
                >
                  <p className="text-sm font-medium text-neutral-950">
                    {product.name}
                  </p>
                  <div className="mt-3 space-y-1.5 text-sm text-neutral-600">
                    <p className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-[2px]"
                        style={{ backgroundColor: SKY }}
                      />
                      {product.requests.toLocaleString("en-US")} requests
                    </p>
                    <p className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-[2px]"
                        style={{ backgroundColor: SKY }}
                      />
                      {formatUsdFromCents(product.cents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="border-b border-neutral-200 pb-3 text-sm font-medium text-neutral-950">
            API keys
          </p>
          {keyBreakdown.length === 0 ? (
            <p className="py-10 text-sm text-neutral-500">No key usage yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {keyBreakdown.map((key) => (
                <li
                  key={key.name}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-500">
                    {key.name.trim().charAt(0).toUpperCase() || "K"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">
                    {key.name}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {formatUsdFromCents(key.cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const filterButtonClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-neutral-200 bg-kenoo-white px-3 text-sm text-neutral-700 transition hover:bg-neutral-50";

const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800";

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center rounded-full bg-neutral-100 px-3 text-sm text-neutral-700">
      {children}
    </span>
  );
}
