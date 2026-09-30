"use client";

import * as React from "react";
import { FileText, Mail, MessageCircleMore, Plus, Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@walls/utils";

type TemplateChannel = "Email" | "SMS" | "Push";

type Template = {
  id: number;
  name: string;
  description: string;
  channel: TemplateChannel;
  body: string;
};

const channelOptions: Array<"All" | TemplateChannel> = ["All", "Email", "SMS", "Push"];

const channelIcons = {
  Email: Mail,
  SMS: MessageCircleMore,
  Push: Sparkles,
} satisfies Record<TemplateChannel, typeof Mail>;

const panelGlassClass = "bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

export function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [activeChannel, setActiveChannel] = React.useState<(typeof channelOptions)[number]>("All");
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const router = useRouter();

  const filteredTemplates = templates.filter((template) => {
    const matchesChannel = activeChannel === "All" || template.channel === activeChannel;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${template.name} ${template.description} ${template.body}`.toLowerCase().includes(query);
    return matchesChannel && matchesSearch;
  });

  return (
    <div className="min-h-full bg-kenoo-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Templates</h1>
            <p className="mt-2 max-w-xl text-[13px] font-light leading-6 text-[#858585]">Create messages once and reuse them across your customer journeys.</p>
          </div>
          <button type="button" onClick={() => setIsCreateOpen(true)} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#2a2a2a]"><Plus className="h-4 w-4" /> Create template</button>
        </header>

        <section className={cn("overflow-hidden rounded-[28px]", panelGlassClass)}>
          <div className="flex flex-col gap-5 border-b border-[#eeeeee] px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Your templates</h2>
                <p className="mt-1 text-[12px] text-[#909090]">Message building blocks for email, SMS, and push notifications</p>
              </div>
              <label className="relative block w-full sm:w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" strokeWidth={1.7} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" className="h-10 w-full rounded-xl border border-[#e5e5e5] bg-white/80 pl-9 pr-3 text-[12px] text-[#333] outline-none transition placeholder:text-[#aaa] focus:border-[#bbb] focus:ring-2 focus:ring-black/[0.04]" />
              </label>
            </div>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {channelOptions.map((option) => <button key={option} type="button" onClick={() => setActiveChannel(option)} className={cn("rounded-full px-3 py-1.5 text-[12px] transition", activeChannel === option ? "bg-[#111] font-medium text-white" : "text-[#888] hover:bg-[#f3f3f3] hover:text-[#444]")}>{option}</button>)}
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="px-6 py-20 text-center sm:px-10">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f0ff] text-[#7258c9]"><FileText className="h-5 w-5" strokeWidth={1.5} /></span>
              <h3 className="mt-5 text-[15px] font-medium text-[#222]">{templates.length === 0 ? "No templates yet" : "No matching templates"}</h3>
              <p className="mx-auto mt-2 max-w-[390px] text-[12px] font-light leading-5 text-[#999]">{templates.length === 0 ? "Create a reusable message to use in your flows and campaigns." : "Try a different search term or channel."}</p>
              {templates.length === 0 ? <button type="button" onClick={() => setIsCreateOpen(true)} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#e2e2e2] bg-white px-3.5 py-2.5 text-[12px] font-medium text-[#444] transition hover:bg-[#f8f8f8]"><Plus className="h-3.5 w-3.5" /> Create your first template</button> : null}
            </div>
          ) : (
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const Icon = channelIcons[template.channel];
                return <article key={template.id} className="rounded-2xl border border-[#eeeeee] bg-white/70 p-5 transition hover:-translate-y-0.5 hover:border-[#dedede] hover:shadow-sm"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f5] text-[#555]"><Icon className="h-4 w-4" strokeWidth={1.7} /></span><span className="rounded-full bg-[#f6f6f6] px-2.5 py-1 text-[10px] font-medium text-[#888]">{template.channel}</span></div><h3 className="mt-4 truncate text-[14px] font-medium text-[#222]">{template.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-[12px] leading-5 text-[#999]">{template.description}</p><div className="mt-4 border-t border-[#f0f0f0] pt-3 text-[11px] leading-5 text-[#777]">{template.body}</div></article>;
              })}
            </div>
          )}
        </section>
      </div>

      {isCreateOpen ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="create-template-title" className="w-full max-w-lg rounded-[26px] bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.18)]"><div className="flex items-start justify-between gap-4"><div><h2 id="create-template-title" className="text-[18px] font-semibold tracking-[-0.03em] text-[#111]">What kind of template?</h2><p className="mt-1 text-[12px] text-[#8c8c8c]">Choose a channel to start building your message.</p></div><button type="button" onClick={() => setIsCreateOpen(false)} aria-label="Close" className="rounded-full p-2 text-[#999] transition hover:bg-[#f4f4f4] hover:text-[#444]"><X className="h-4 w-4" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-3">{(["Email", "SMS", "Push"] as TemplateChannel[]).map((option) => { const Icon = channelIcons[option]; return <button key={option} type="button" onClick={() => router.push(`/templates/new/${option.toLowerCase()}`)} className="group flex flex-col items-center rounded-2xl border border-white/70 bg-white/75 px-3 py-6 text-center shadow-[0_8px_28px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-white hover:bg-white/90 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,1)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f5f5] text-[#555] transition group-hover:bg-[#eee]"><Icon className="h-5 w-5" strokeWidth={1.6} /></span><span className="mt-3 text-[13px] font-medium text-[#333]">{option}</span><span className="mt-1 text-[11px] text-[#999]">{option === "Email" ? "Rich messages" : option === "SMS" ? "Short messages" : "App notifications"}</span></button>; })}</div></div></div> : null}
    </div>
  );
}
