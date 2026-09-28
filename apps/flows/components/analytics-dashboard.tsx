"use client";

import {
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleHelp,
  Mail,
  MousePointerClick,
  Users,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@walls/utils";

const panelGlassClass =
  "bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

const chartBars = [42, 52, 45, 59, 55, 69, 63, 76, 72, 88, 81, 94, 86, 100];

const channels = [
  { label: "Email", value: "68%", detail: "8,724 delivered", color: "bg-[#b9e8d0]", icon: Mail },
  { label: "Flows", value: "21%", detail: "2,694 delivered", color: "bg-[#d9e8ff]", icon: BarChart3 },
  { label: "Other", value: "11%", detail: "1,424 delivered", color: "bg-[#f5dfb5]", icon: CircleHelp },
];

const topFlows = [
  { name: "New customer welcome", delivered: "1,842", conversion: "34.2%", revenue: "$11,420" },
  { name: "Abandoned checkout recovery", delivered: "2,481", conversion: "18.6%", revenue: "$24,860" },
  { name: "Post-purchase review request", delivered: "634", conversion: "12.8%", revenue: "$2,180" },
];

export function AnalyticsDashboard() {
  return (
    <div className="min-h-full bg-kenoo-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">Performance overview</p>
            <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Analytics</h1>
            <p className="mt-2 max-w-[560px] text-[14px] leading-6 text-[#777]">See how your customer journeys are performing and where there is room to grow.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/analytics/metrics" className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-2.5 text-[12px] font-medium text-[#555] shadow-sm transition hover:border-[#ccc] hover:bg-[#fdfdfd]">
              View events <ArrowUpRight className="h-3.5 w-3.5 text-[#999]" />
            </Link>
            <button className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3.5 py-2.5 text-[12px] font-medium text-[#555] shadow-sm transition hover:border-[#ccc] hover:bg-[#fdfdfd]">
              Last 30 days <ChevronDown className="h-3.5 w-3.5 text-[#999]" />
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total revenue" value="$38,460" change="18.4%" icon={ArrowUpRight} />
          <MetricCard label="Profiles reached" value="4,957" change="8.2%" icon={Users} />
          <MetricCard label="Messages delivered" value="12,842" change="24.6%" icon={Mail} />
          <MetricCard label="Conversion rate" value="22.8%" change="4.1%" icon={MousePointerClick} />
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className={cn("rounded-[28px] p-5 sm:p-6", panelGlassClass)}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Performance over time</h2>
                <p className="mt-1 text-[12px] text-[#909090]">Revenue generated across your customer journeys</p>
              </div>
              <span className="hidden items-center gap-1.5 text-[11px] text-[#858585] sm:flex"><span className="h-2 w-2 rounded-full bg-[#79c99c]" /> Revenue</span>
            </div>
            <div className="relative h-[220px] border-b border-l border-[#eeeeee] bg-[linear-gradient(to_bottom,transparent_24%,#f2f2f2_25%,transparent_26%,transparent_49%,#f2f2f2_50%,transparent_51%,transparent_74%,#f2f2f2_75%,transparent_76%)] px-3 pb-0 pt-4 sm:px-5">
              <div className="flex h-full items-end gap-1.5 sm:gap-3">
                {chartBars.map((height, index) => (
                  <div key={index} className="group flex h-full flex-1 items-end">
                    <div className="relative w-full rounded-t-sm bg-[#cdeedb] transition-colors group-hover:bg-[#9bd9b7]" style={{ height: `${height}%` }}>
                      <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#111] px-1.5 py-1 text-[9px] text-white group-hover:block">${(height * 385).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between pl-1 pt-3 text-[10px] text-[#aaa]"><span>Aug 27</span><span>Sep 3</span><span>Sep 10</span><span>Sep 17</span><span>Sep 24</span></div>
          </div>

          <div className={cn("rounded-[28px] p-5 sm:p-6", panelGlassClass)}>
            <div className="mb-5"><h2 className="text-[15px] font-semibold tracking-[-0.02em]">Channel mix</h2><p className="mt-1 text-[12px] text-[#909090]">Messages delivered by source</p></div>
            <div className="mb-7 flex h-3 overflow-hidden rounded-full bg-[#f1f1f1]"><div className="w-[68%] bg-[#b9e8d0]" /><div className="w-[21%] bg-[#d9e8ff]" /><div className="w-[11%] bg-[#f5dfb5]" /></div>
            <div className="space-y-5">{channels.map(({ label, value, detail, color, icon: Icon }) => <div key={label} className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color} text-[#555]`}><Icon className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><span className="text-[12px] font-medium text-[#333]">{label}</span><span className="text-[12px] font-semibold text-[#222]">{value}</span></div><p className="mt-0.5 text-[11px] text-[#999]">{detail}</p></div></div>)}</div>
          </div>
        </section>

        <section className={cn("mt-8 rounded-[28px]", panelGlassClass)}>
          <div className="flex flex-col justify-between gap-2 border-b border-[#eeeeee] px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><h2 className="text-[15px] font-semibold tracking-[-0.02em]">Top-performing flows</h2><p className="mt-1 text-[12px] text-[#909090]">Journeys contributing the most to your results</p></div><button className="w-fit text-[12px] font-medium text-[#777] hover:text-[#222]">View all flows <span className="ml-1">→</span></button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead><tr className="border-b border-[#f1f1f1] text-[10px] uppercase tracking-[0.1em] text-[#a0a0a0]"><th className="px-6 py-3 font-medium">Flow</th><th className="px-4 py-3 text-right font-medium">Delivered</th><th className="px-4 py-3 text-right font-medium">Conversion</th><th className="px-6 py-3 text-right font-medium">Revenue</th></tr></thead><tbody>{topFlows.map((flow) => <tr key={flow.name} className="border-b border-[#f3f3f3] last:border-0 hover:bg-[#fcfcfc]"><td className="px-6 py-4 text-[13px] font-medium text-[#222]">{flow.name}</td><td className="px-4 py-4 text-right text-[12px] text-[#555]">{flow.delivered}</td><td className="px-4 py-4 text-right text-[12px] font-medium text-[#27825a]">{flow.conversion}</td><td className="px-6 py-4 text-right text-[12px] font-semibold text-[#222]">{flow.revenue}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: typeof ArrowUpRight }) {
  return <div className={cn("rounded-[28px] p-5", panelGlassClass)}><div className="flex items-start justify-between"><p className="text-[12px] text-[#858585]">{label}</p><Icon className="h-4 w-4 text-[#a0a0a0]" /></div><div className="mt-5 flex items-end justify-between gap-3"><p className="text-[24px] font-semibold tracking-[-0.04em]">{value}</p><span className="mb-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-[#27825a]"><ArrowUpRight className="h-3 w-3" />{change}</span></div></div>;
}
