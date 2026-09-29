"use client";

import * as React from "react";
import { GitBranch, Plus, Search } from "lucide-react";
import Link from "next/link";

import { cn } from "@walls/utils";

const panelGlassClass = "bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

export function FlowsPage() {
  const [search, setSearch] = React.useState("");

  return (
    <div className="min-h-full bg-kenoo-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">Customer journeys</p>
            <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Flows</h1>
            <p className="mt-2 max-w-xl text-[13px] font-light leading-6 text-[#858585]">Build automated journeys that respond to the moments happening across your applications.</p>
          </div>
          <Link href="/flows/new" className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#2a2a2a]"><Plus className="h-4 w-4" /> Create flow</Link>
        </header>

        <section className={cn("overflow-hidden rounded-[28px]", panelGlassClass)}>
          <div className="flex flex-col gap-4 border-b border-[#eeeeee] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Your flows</h2>
              <p className="mt-1 text-[12px] text-[#909090]">Automations that react to customer behavior</p>
            </div>
            <label className="relative block w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" strokeWidth={1.7} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search flows" className="h-10 w-full rounded-xl border border-[#e5e5e5] bg-white/80 pl-9 pr-3 text-[12px] text-[#333] outline-none transition placeholder:text-[#aaa] focus:border-[#bbb] focus:ring-2 focus:ring-black/[0.04]" />
            </label>
          </div>

          <div className="px-6 py-20 text-center sm:px-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef8f2] text-[#238252]"><GitBranch className="h-5 w-5" strokeWidth={1.5} /></span>
            <h3 className="mt-5 text-[15px] font-medium text-[#222]">{search.trim() ? "No matching flows" : "No flows yet"}</h3>
            <p className="mx-auto mt-2 max-w-[390px] text-[12px] font-light leading-5 text-[#999]">{search.trim() ? "Try a different search term." : "Create your first flow to turn an event from your audience into an automated customer journey."}</p>
            {!search.trim() ? <Link href="/flows/new" className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#e2e2e2] bg-white px-3.5 py-2.5 text-[12px] font-medium text-[#444] transition hover:bg-[#f8f8f8]"><Plus className="h-3.5 w-3.5" /> Create your first flow</Link> : null}
          </div>
        </section>
      </div>

    </div>
  );
}
