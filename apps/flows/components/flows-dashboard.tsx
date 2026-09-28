"use client";

import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  Clock3,
  GitBranch,
  Mail,
  MoreHorizontal,
  Plus,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

const flows = [
  { name: "Abandoned checkout recovery", trigger: "Checkout started", status: "Live", enrolled: "2,481", conversion: "18.6%", revenue: "$24,860", color: "bg-[#dff7eb] text-[#14804a]" },
  { name: "New customer welcome", trigger: "Order completed", status: "Live", enrolled: "1,842", conversion: "34.2%", revenue: "$11,420", color: "bg-[#dff7eb] text-[#14804a]" },
  { name: "Win back inactive customers", trigger: "No purchase in 90 days", status: "Draft", enrolled: "—", conversion: "—", revenue: "—", color: "bg-[#f3f3f3] text-[#737373]" },
  { name: "Post-purchase review request", trigger: "Order delivered", status: "Paused", enrolled: "634", conversion: "12.8%", revenue: "$2,180", color: "bg-[#fff4d6] text-[#9a6800]" },
];

export function FlowsDashboard() {
  const [showFlowPreview, setShowFlowPreview] = useState(false);

  return (
    <div className="min-h-full bg-[#fafafa]">
        <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 lg:px-12">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">Customer engagement</p><h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Make every customer moment count.</h1><p className="mt-2 max-w-[560px] text-[14px] leading-6 text-[#777]">Build intelligent email journeys that respond to what your customers do next.</p></div><button onClick={() => setShowFlowPreview(true)} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#2a2a2a]"><Plus className="h-4 w-4" /> Create flow</button></div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Flow revenue" value="$38,460" change="+18.4%" icon={Activity} /><MetricCard label="Active profiles" value="4,957" change="+8.2%" icon={Users} /><MetricCard label="Emails delivered" value="12,842" change="+24.6%" icon={Mail} /><MetricCard label="Avg. conversion" value="22.8%" change="+4.1%" icon={ArrowUpRight} /></section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="rounded-2xl border border-[#e8e8e8] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-[15px] font-semibold tracking-[-0.02em]">Flow performance</h2><p className="mt-1 text-[12px] text-[#909090]">Revenue attributed to active customer journeys</p></div><button className="flex items-center gap-1.5 rounded-md border border-[#e7e7e7] px-2.5 py-1.5 text-[11px] text-[#737373]">Last 30 days <ChevronDown className="h-3 w-3" /></button></div><div className="flex h-[190px] items-end gap-2 border-b border-[#eeeeee] px-2 pb-0 pt-5 sm:gap-3">{[42, 55, 49, 68, 61, 76, 70, 84, 77, 94, 88, 100].map((height, index) => <div key={index} className="group flex h-full flex-1 items-end"><div className="relative w-full rounded-t-md bg-[#d9f2e6] transition-all group-hover:bg-[#b9e8d0]" style={{ height: `${height}%` }}><span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#111] px-1.5 py-1 text-[9px] text-white group-hover:block">${(height * 36).toLocaleString()}</span></div></div>)}</div><div className="flex justify-between px-1 pt-3 text-[10px] text-[#aaa]"><span>Aug 27</span><span>Sep 3</span><span>Sep 10</span><span>Sep 17</span><span>Sep 24</span></div></div><div className="rounded-2xl border border-[#e8e8e8] bg-[#111] p-6 text-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]"><div className="mb-8 flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2b2b2b]"><Sparkles className="h-4 w-4 text-[#c7f3dc]" /></div><span className="rounded-full bg-[#214e38] px-2 py-1 text-[10px] font-medium text-[#baf0d1]">AI insight</span></div><h2 className="text-[18px] font-medium leading-7 tracking-[-0.02em]">Your checkout flow is doing the heavy lifting.</h2><p className="mt-3 text-[12px] leading-5 text-[#a8a8a8]">It generated 65% of attributed flow revenue this month. Consider testing a shorter first delay.</p><button className="mt-7 text-[12px] font-medium text-[#c7f3dc] hover:text-white">View recommendation <span className="ml-1">→</span></button></div></section>

          <section className="mt-8 rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]"><div className="flex flex-col justify-between gap-4 border-b border-[#eeeeee] px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><h2 className="text-[15px] font-semibold tracking-[-0.02em]">Your flows</h2><p className="mt-1 text-[12px] text-[#909090]">Automations that react to customer behavior</p></div><button onClick={() => setShowFlowPreview(true)} className="flex w-fit items-center gap-2 rounded-lg border border-[#e5e5e5] px-3 py-2 text-[12px] font-medium text-[#555] hover:bg-[#f8f8f8]"><Plus className="h-3.5 w-3.5" /> New flow</button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-[#f1f1f1] text-[10px] uppercase tracking-[0.1em] text-[#a0a0a0]"><th className="px-6 py-3 font-medium">Flow</th><th className="px-4 py-3 font-medium">Trigger</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Profiles</th><th className="px-4 py-3 text-right font-medium">Conversion</th><th className="px-4 py-3 text-right font-medium">Revenue</th><th className="w-10 px-4 py-3" /></tr></thead><tbody>{flows.map((flow) => <tr key={flow.name} className="group border-b border-[#f3f3f3] last:border-0 hover:bg-[#fcfcfc]"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1f8f4] text-[#238252]"><GitBranch className="h-3.5 w-3.5" /></div><span className="text-[13px] font-medium text-[#222]">{flow.name}</span></div></td><td className="px-4 py-4 text-[12px] text-[#777]"><span className="inline-flex items-center gap-1.5"><Zap className="h-3 w-3 text-[#b18522]" />{flow.trigger}</span></td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${flow.color}`}>{flow.status}</span></td><td className="px-4 py-4 text-right text-[12px] text-[#555]">{flow.enrolled}</td><td className="px-4 py-4 text-right text-[12px] text-[#555]">{flow.conversion}</td><td className="px-4 py-4 text-right text-[12px] font-medium text-[#222]">{flow.revenue}</td><td className="px-4 py-4 text-right"><button className="rounded-md p-1.5 text-[#aaa] opacity-0 transition hover:bg-[#f0f0f0] hover:text-[#444] group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></section>
        </div>
      {showFlowPreview && <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/20 p-4" onClick={() => setShowFlowPreview(false)}><div className="w-full max-w-[620px] rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#9a9a9a]">Create a flow</p><h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">Start with a customer moment.</h2><p className="mt-2 text-[13px] text-[#777]">Choose a trigger and Flows will help you build the next best action.</p></div><button onClick={() => setShowFlowPreview(false)} className="text-2xl leading-none text-[#aaa]">×</button></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><TriggerCard icon={Clock3} title="Abandoned checkout" description="Customer starts checkout but does not purchase" /><TriggerCard icon={Users} title="New profile added" description="A new person enters your audience" /><TriggerCard icon={Mail} title="Email engagement" description="A person opens or clicks a message" /><TriggerCard icon={Zap} title="Custom event" description="React to an event from your apps or API" /></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowFlowPreview(false)} className="rounded-lg px-3 py-2 text-[12px] text-[#777] hover:bg-[#f7f7f7]">Cancel</button><button onClick={() => setShowFlowPreview(false)} className="rounded-lg bg-[#111] px-4 py-2 text-[12px] font-medium text-white">Continue</button></div></div></div>}
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: typeof Activity }) {
  return <div className="rounded-2xl border border-[#e8e8e8] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"><div className="flex items-start justify-between"><p className="text-[12px] text-[#858585]">{label}</p><Icon className="h-4 w-4 text-[#a0a0a0]" /></div><div className="mt-5 flex items-end justify-between gap-3"><p className="text-[24px] font-semibold tracking-[-0.04em]">{value}</p><span className="mb-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-[#27825a]"><ArrowUpRight className="h-3 w-3" />{change}</span></div></div>;
}

function TriggerCard({ icon: Icon, title, description }: { icon: typeof Clock3; title: string; description: string }) {
  return <button className="group rounded-xl border border-[#e7e7e7] p-4 text-left transition hover:border-[#b7dcca] hover:bg-[#f8fcfa]"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef8f2] text-[#238252] transition group-hover:bg-[#dff3e8]"><Icon className="h-4 w-4" /></div><p className="mt-3 text-[13px] font-medium">{title}</p><p className="mt-1 text-[11px] leading-4 text-[#858585]">{description}</p></button>;
}
