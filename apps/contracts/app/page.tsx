"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  Bell,
  ChevronDown,
  ChevronLeft,
  Clock3,
  FileCheck2,
  FilePlus2,
  Files,
  FolderOpen,
  Home,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Signature,
  Upload,
  Users,
} from "lucide-react";

type Status = "Needs action" | "Waiting" | "Completed" | "Draft";

type Contract = {
  name: string;
  counterpart: string;
  updated: string;
  status: Status;
  initials: string;
  color: string;
};

const contracts: Contract[] = [
  { name: "Master Services Agreement", counterpart: "Acme Corporation", updated: "Today, 10:42 AM", status: "Needs action", initials: "AC", color: "bg-[#e6f1ff] text-[#30649b]" },
  { name: "Creator Partnership Agreement", counterpart: "Jordan Lee", updated: "Yesterday", status: "Waiting", initials: "JL", color: "bg-[#fcebdc] text-[#9b5d2f]" },
  { name: "Office Lease Renewal", counterpart: "Harbour Properties", updated: "Sep 28, 2026", status: "Completed", initials: "HP", color: "bg-[#e5f3e9] text-[#42805b]" },
  { name: "Software License Agreement", counterpart: "Cloudline Inc.", updated: "Sep 26, 2026", status: "Draft", initials: "CI", color: "bg-[#f0e8fb] text-[#77519c]" },
  { name: "Independent Contractor Agreement", counterpart: "Morgan Taylor", updated: "Sep 23, 2026", status: "Completed", initials: "MT", color: "bg-[#ffe8eb] text-[#a6505e]" },
];

const statusStyles: Record<Status, string> = {
  "Needs action": "bg-[#fff4d8] text-[#9a6b10]",
  Waiting: "bg-[#edf3ff] text-[#5474ad]",
  Completed: "bg-[#e8f5eb] text-[#42805b]",
  Draft: "bg-[#f0f0f0] text-[#6d6d6d]",
};

function NavItem({ icon: Icon, label, active, onClick }: { icon: typeof Home; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition ${active ? "bg-white font-medium text-[#161616] shadow-sm" : "text-[#777] hover:bg-white/70 hover:text-[#333]"}`}>
      <Icon size={17} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  );
}

export default function ContractsPage() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const filteredContracts = useMemo(() => contracts.filter((contract) => {
    const matchesStatus = filter === "All" || contract.status === filter;
    const haystack = `${contract.name} ${contract.counterpart}`.toLowerCase();
    return matchesStatus && haystack.includes(query.toLowerCase());
  }), [filter, query]);

  return (
    <div className="flex h-full bg-[#fafafa]">
      <aside className="hidden w-[236px] shrink-0 border-r border-[#ececec] bg-[#f5f5f3] px-3 py-5 md:block">
        <div className="mb-7 flex items-center gap-2 px-3 text-[15px] font-semibold tracking-[-0.02em]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#171717] text-white"><Signature size={15} /></span>
          Contracts
        </div>
        <button onClick={() => setShowComposer(true)} className="mb-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1e1e1e] text-[13px] font-medium text-white shadow-sm transition hover:bg-black"><Plus size={16} /> New contract</button>
        <div className="space-y-1">
          <NavItem icon={Home} label="Overview" active={activeNav === "Overview"} onClick={() => setActiveNav("Overview")} />
          <NavItem icon={Files} label="All contracts" active={activeNav === "All contracts"} onClick={() => setActiveNav("All contracts")} />
          <NavItem icon={Clock3} label="Waiting for signature" active={activeNav === "Waiting for signature"} onClick={() => { setActiveNav("Waiting for signature"); setFilter("Waiting"); }} />
          <NavItem icon={FileCheck2} label="Completed" active={activeNav === "Completed"} onClick={() => { setActiveNav("Completed"); setFilter("Completed"); }} />
          <NavItem icon={Archive} label="Archive" active={activeNav === "Archive"} onClick={() => setActiveNav("Archive")} />
        </div>
        <div className="my-6 border-t border-[#e6e6e4]" />
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#aaa]">Workspace</p>
        <div className="space-y-1">
          <NavItem icon={FolderOpen} label="Templates" active={activeNav === "Templates"} onClick={() => setActiveNav("Templates")} />
          <NavItem icon={Users} label="Contacts" active={activeNav === "Contacts"} onClick={() => setActiveNav("Contacts")} />
          <NavItem icon={Settings} label="Settings" active={activeNav === "Settings"} onClick={() => setActiveNav("Settings")} />
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-[#e6e6e4] pt-5 text-[12px] text-[#777]"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9e8df] font-medium text-[#477158]">CW</div><div><p className="font-medium text-[#333]">Caleb Williams</p><p>Kenoo Inc.</p></div><ChevronDown className="ml-auto" size={14} /></div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="flex h-[68px] items-center justify-between border-b border-[#ececec] bg-white/80 px-5 sm:px-10">
          <div className="flex items-center gap-2 text-[13px] text-[#8b8b8b]"><span className="md:hidden">Contracts</span><span className="hidden md:inline">Workspace</span><ChevronLeft className="hidden rotate-180 md:block" size={15} /><span className="hidden text-[#333] md:inline">Overview</span></div>
          <div className="flex items-center gap-4 text-[#898989]"><button aria-label="Notifications" className="rounded-full p-1.5 hover:bg-[#f3f3f3]"><Bell size={18} strokeWidth={1.6} /></button><div className="h-7 w-7 rounded-full bg-[#d9e8df] text-center text-[10px] font-medium leading-7 text-[#477158]">CW</div></div>
        </header>

        <div className="mx-auto max-w-[1180px] px-5 py-9 sm:px-10">
          <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[12px] font-medium text-[#999]">Thursday, October 1, 2026</p><h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[#151515]">Good morning, Caleb</h1><p className="mt-2 text-[14px] text-[#888]">Here’s what’s happening with your contracts.</p></div><button onClick={() => setShowComposer(true)} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1e1e1e] px-4 text-[13px] font-medium text-white transition hover:bg-black"><FilePlus2 size={16} /> New contract</button></div>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[{ label: "Total contracts", value: "24", detail: "+3 this month", icon: Files }, { label: "Needs your attention", value: "3", detail: "Review required", icon: Bell }, { label: "Waiting for signatures", value: "7", detail: "Across 4 recipients", icon: Send }, { label: "Completed this month", value: "12", detail: "92% completion rate", icon: ShieldCheck }].map(({ label, value, detail, icon: Icon }) => <div key={label} className="rounded-2xl border border-[#e8e8e8] bg-white p-5"><div className="mb-5 flex items-center justify-between text-[#999]"><span className="text-[12px]">{label}</span><Icon size={16} strokeWidth={1.6} /></div><p className="text-[27px] font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-[11px] text-[#8c8c8c]">{detail}</p></div>)}
          </section>

          <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0 rounded-2xl border border-[#e8e8e8] bg-white">
              <div className="flex flex-col gap-4 border-b border-[#ededed] px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-[15px] font-semibold">Recent contracts</h2><p className="mt-1 text-[12px] text-[#999]">Your latest documents and signature requests</p></div><div className="relative"><Search className="absolute left-3 top-2.5 text-[#aaa]" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contracts" className="h-9 w-full rounded-lg border border-[#e7e7e7] bg-[#fafafa] pl-9 pr-3 text-[12px] outline-none placeholder:text-[#aaa] focus:border-[#bbb] sm:w-[190px]" /></div></div>
              <div className="flex gap-1 overflow-x-auto border-b border-[#f0f0f0] px-5 pt-3">{(["All", "Needs action", "Waiting", "Completed", "Draft"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap border-b-2 px-2 pb-3 text-[12px] ${filter === item ? "border-[#222] font-medium text-[#222]" : "border-transparent text-[#999] hover:text-[#444]"}`}>{item}</button>)}</div>
              <div className="divide-y divide-[#f0f0f0]">{filteredContracts.map((contract) => <button key={contract.name} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#fcfcfc]"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ${contract.color}`}>{contract.initials}</div><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-[#303030]">{contract.name}</p><p className="mt-1 truncate text-[11px] text-[#999]">{contract.counterpart} · {contract.updated}</p></div><span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-medium sm:inline-flex ${statusStyles[contract.status]}`}>{contract.status}</span><MoreHorizontal className="shrink-0 text-[#aaa]" size={17} /></button>)}{filteredContracts.length === 0 && <div className="px-5 py-10 text-center text-[13px] text-[#999]">No contracts match your search.</div>}</div>
              <button onClick={() => { setFilter("All"); setActiveNav("All contracts"); }} className="w-full border-t border-[#f0f0f0] px-5 py-3 text-center text-[12px] font-medium text-[#777] hover:bg-[#fcfcfc]">View all contracts</button>
            </section>

            <section className="rounded-2xl border border-[#e8e8e8] bg-white"><div className="border-b border-[#ededed] px-5 py-5"><h2 className="text-[15px] font-semibold">Activity</h2><p className="mt-1 text-[12px] text-[#999]">Recent updates from your workspace</p></div><div className="space-y-6 px-5 py-5">{[["Master Services Agreement", "You opened this contract", "10 min ago", "bg-[#e6f1ff] text-[#30649b]"], ["Creator Partnership Agreement", "Jordan Lee viewed the document", "Yesterday", "bg-[#fcebdc] text-[#9b5d2f]"], ["Office Lease Renewal", "All parties signed", "Sep 28", "bg-[#e5f3e9] text-[#42805b]"]].map(([name, action, time, color]) => <div key={name} className="flex gap-3"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color}`}><FileCheck2 size={13} /></div><div><p className="text-[12px] font-medium text-[#444]">{action}</p><p className="mt-1 text-[11px] text-[#999]">{name}</p><p className="mt-1 text-[10px] text-[#aaa]">{time}</p></div></div>)}</div><div className="border-t border-[#f0f0f0] px-5 py-3"><button className="text-[12px] font-medium text-[#777] hover:text-[#333]">View activity log</button></div></section>
          </div>
          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#aaa]"><Lock size={11} /> Your documents are encrypted and securely stored</p>
        </div>
      </main>

      {showComposer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]" onClick={() => setShowComposer(false)}><div className="w-full max-w-[500px] rounded-2xl border border-[#e4e4e4] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-6 flex items-start justify-between"><div><h2 className="text-[18px] font-semibold tracking-[-0.02em]">New contract</h2><p className="mt-1 text-[13px] text-[#888]">Start from a document or use a saved template.</p></div><button onClick={() => setShowComposer(false)} className="rounded-lg p-1 text-[#999] hover:bg-[#f5f5f5]"><ChevronDown className="rotate-180" size={18} /></button></div><button className="mb-3 flex w-full items-center gap-4 rounded-xl border border-dashed border-[#d8d8d8] bg-[#fafafa] p-4 text-left transition hover:border-[#aaa] hover:bg-white"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ededed] text-[#555]"><Upload size={18} /></span><span><span className="block text-[13px] font-medium">Upload a document</span><span className="mt-1 block text-[11px] text-[#999]">PDF, DOCX, or DOC up to 25 MB</span></span></button><button className="flex w-full items-center gap-4 rounded-xl border border-[#e7e7e7] p-4 text-left transition hover:bg-[#fafafa]"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f1eef9] text-[#77519c]"><FolderOpen size={18} /></span><span><span className="block text-[13px] font-medium">Use a template</span><span className="mt-1 block text-[11px] text-[#999]">Choose from your saved templates</span></span></button><div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowComposer(false)} className="rounded-lg px-3 py-2 text-[12px] text-[#777] hover:bg-[#f5f5f5]">Cancel</button><button onClick={() => setShowComposer(false)} className="rounded-lg bg-[#1e1e1e] px-4 py-2 text-[12px] font-medium text-white">Continue</button></div></div></div>}
    </div>
  );
}
