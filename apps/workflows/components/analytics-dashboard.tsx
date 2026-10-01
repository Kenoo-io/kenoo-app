"use client";

import { ArrowUpRight, BarChart3, CheckCircle2, ChevronDown, CircleHelp, Clock3, CreditCard, HeartHandshake, Mail, MailPlus, MailX, MousePointerClick, ShoppingCart, Sparkles, UserRound, UserRoundPen, Users } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@walls/utils";

const panelGlassClass = "bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";
const numberFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

type AnalyticsData = {
  summary: { totalOccurrences: number; activeEventTypes: number; occurrencesToday: number; uniqueProfiles: number; configuredEventTypes: number };
  daily: { date: string; count: number }[];
  breakdown: { key: string; name: string; category: string; count: number; share: number; lastOccurredAt: string }[];
};

export function AnalyticsDashboard() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/analytics");
        if (!response.ok) throw new Error("Unable to load analytics");
        setData((await response.json()) as AnalyticsData);
      } catch {
        setError("Unable to load event activity");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const dailyMax = Math.max(...(data?.daily.map((day) => day.count) ?? [0]), 1);
  const summary = data?.summary;

  return (
    <div className="min-h-full bg-kenoo-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">Performance overview</p><h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Analytics</h1></div>
          <div className="flex flex-wrap items-center gap-2"><Link href="/analytics/metrics" className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-2.5 text-[12px] font-medium text-[#555] shadow-sm transition hover:border-[#ccc] hover:bg-[#fdfdfd]">View events <ArrowUpRight className="h-3.5 w-3.5 text-[#999]" /></Link><button type="button" className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-2.5 text-[12px] font-medium text-[#555] shadow-sm">Last 30 days <ChevronDown className="h-3.5 w-3.5 text-[#999]" /></button></div>
        </header>

        {error ? <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Event occurrences" value={summary ? numberFormatter.format(summary.totalOccurrences) : "—"} hint="in the last 30 days" icon={BarChart3} loading={loading} />
          <MetricCard label="Active event types" value={summary ? numberFormatter.format(summary.activeEventTypes) : "—"} hint={summary ? `${summary.configuredEventTypes} configured` : "—"} icon={MousePointerClick} loading={loading} />
          <MetricCard label="Occurrences today" value={summary ? numberFormatter.format(summary.occurrencesToday) : "—"} hint="received since midnight" icon={Mail} loading={loading} />
          <MetricCard label="Unique profiles" value={summary ? numberFormatter.format(summary.uniqueProfiles) : "—"} hint="from external IDs" icon={Users} loading={loading} />
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className={cn("rounded-[28px] p-5 sm:p-6", panelGlassClass)}><div className="mb-5 flex items-start justify-between"><div><h2 className="text-[15px] font-semibold tracking-[-0.02em]">Event activity over time</h2><p className="mt-1 text-[12px] text-[#909090]">Occurrences received across the last 30 days</p></div><span className="hidden items-center gap-1.5 text-[11px] text-[#858585] sm:flex"><span className="h-2 w-2 rounded-full bg-[#79c99c]" /> Occurrences</span></div><div className="relative h-[220px] border-b border-l border-[#eeeeee] bg-[linear-gradient(to_bottom,transparent_24%,#f2f2f2_25%,transparent_26%,transparent_49%,#f2f2f2_50%,transparent_51%,transparent_74%,#f2f2f2_75%,transparent_76%)] px-3 pb-0 pt-4 sm:px-5">{loading ? <div className="h-full animate-pulse rounded bg-[#f5f5f5]" /> : data?.daily.every((day) => day.count === 0) ? <EmptyState message="No event occurrences in this period" /> : <div className="flex h-full items-end gap-1 sm:gap-2">{data?.daily.map((day) => <div key={day.date} className="group flex h-full flex-1 items-end"><div className="relative w-full rounded-t-sm bg-[#cdeedb] transition-colors group-hover:bg-[#9bd9b7]" style={{ height: `${Math.max((day.count / dailyMax) * 100, day.count ? 4 : 0)}%` }}><span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#111] px-1.5 py-1 text-[9px] text-white group-hover:block">{numberFormatter.format(day.count)}</span></div></div>)}</div>}</div><div className="flex justify-between pl-1 pt-3 text-[10px] text-[#aaa]"><span>{formatShortDate(data?.daily[0]?.date)}</span><span>{formatShortDate(data?.daily[7]?.date)}</span><span>{formatShortDate(data?.daily[14]?.date)}</span><span>{formatShortDate(data?.daily[21]?.date)}</span><span>{formatShortDate(data?.daily[29]?.date)}</span></div></div>
          <div className={cn("rounded-[28px] p-5 sm:p-6", panelGlassClass)}><div className="mb-5"><h2 className="text-[15px] font-semibold tracking-[-0.02em]">Event mix</h2><p className="mt-1 text-[12px] text-[#909090]">Share of received occurrences</p></div>{loading ? <div className="space-y-5">{[1, 2, 3].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-[#f5f5f5]" />)}</div> : data?.breakdown.length ? <div className="space-y-5">{data.breakdown.slice(0, 5).map((event, index) => { const Icon = getEventIcon(event.key, event.category); return <div key={event.key} className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${index === 0 ? "bg-[#b9e8d0]" : index === 1 ? "bg-[#d9e8ff]" : "bg-[#f5dfb5]"} text-[#555]`}><Icon className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><span className="truncate text-[12px] font-medium text-[#333]">{event.name}</span><span className="text-[12px] font-semibold text-[#222]">{event.share}%</span></div><p className="mt-0.5 text-[11px] text-[#999]">{numberFormatter.format(event.count)} occurrences</p></div></div>; })}</div> : <EmptyState message="No event mix to show yet" />}</div>
        </section>

        <section className={cn("mt-8 rounded-[28px]", panelGlassClass)}><div className="flex flex-col justify-between gap-2 border-b border-[#eeeeee] px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><h2 className="text-[15px] font-semibold tracking-[-0.02em]">Most active events</h2><p className="mt-1 text-[12px] text-[#909090]">Event definitions ranked by received occurrences</p></div><Link href="/analytics/metrics" className="w-fit text-[12px] font-medium text-[#777] hover:text-[#222]">Manage events <span className="ml-1">→</span></Link></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead><tr className="border-b border-[#f1f1f1] text-[10px] uppercase tracking-[0.1em] text-[#a0a0a0]"><th className="px-6 py-3 font-medium">Event</th><th className="px-4 py-3 text-right font-medium">Occurrences</th><th className="px-4 py-3 text-right font-medium">Share</th><th className="px-6 py-3 text-right font-medium">Last received</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="px-6 py-8 text-center text-xs text-[#999]">Loading event activity…</td></tr> : data?.breakdown.length ? data.breakdown.map((event) => <tr key={event.key} className="border-b border-[#f3f3f3] last:border-0 hover:bg-[#fcfcfc]"><td className="px-6 py-4"><p className="text-[13px] font-medium text-[#222]">{event.name}</p><p className="mt-0.5 font-mono text-[10px] text-[#999]">{event.key}</p></td><td className="px-4 py-4 text-right text-[12px] text-[#555]">{numberFormatter.format(event.count)}</td><td className="px-4 py-4 text-right text-[12px] font-medium text-[#27825a]">{event.share}%</td><td className="px-6 py-4 text-right text-[12px] text-[#555]">{formatRelativeTime(event.lastOccurredAt)}</td></tr>) : <tr><td colSpan={4}><EmptyState message="No event occurrences received yet" /></td></tr>}</tbody></table></div></section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon, loading }: { label: string; value: string; hint: string; icon: typeof ArrowUpRight; loading: boolean }) { return <div className={cn("rounded-[28px] p-5", panelGlassClass)}><div className="flex items-start justify-between"><p className="text-[12px] text-[#858585]">{label}</p><Icon className="h-4 w-4 text-[#a0a0a0]" /></div><div className="mt-5 flex items-end justify-between gap-3"><p className={cn("text-[24px] font-semibold tracking-[-0.04em]", loading && "animate-pulse text-[#bbb]")}>{value}</p><span className="mb-1 text-right text-[10px] text-[#999]">{hint}</span></div></div>; }
function EmptyState({ message }: { message: string }) { return <div className="flex h-full items-center justify-center text-[12px] text-[#999]">{message}</div>; }
function getEventIcon(key: string, category: string) {
  const icons = { checkout_started: ShoppingCart, checkout_completed: CheckCircle2, checkout_abandoned: Clock3, cart_updated: ShoppingCart, donation_created: HeartHandshake, profile_created: UserRound, profile_updated: UserRoundPen, email_subscribed: MailPlus, email_unsubscribed: MailX, payment_failed: CreditCard } as const;
  return icons[key as keyof typeof icons] ?? (category === "commerce" ? CreditCard : category === "engagement" ? Mail : category === "profile" ? UserRound : category === "custom" ? Sparkles : CircleHelp);
}
function formatShortDate(value?: string) { return value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—"; }
function formatRelativeTime(value: string) { const elapsed = Date.now() - new Date(value).getTime(); const minutes = Math.max(1, Math.floor(elapsed / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
