"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FileText, Mail, MessageCircleMore, Plus, Search, Smartphone, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@walls/utils";

type TemplateChannel = "Email" | "SMS" | "Push";

type Template = {
  id: string;
  name: string;
  description: string;
  channel: TemplateChannel;
  body: string;
};

const channelOptions: Array<"All" | TemplateChannel> = ["All", "Email", "SMS", "Push"];

const channelIcons = {
  Email: Mail,
  SMS: MessageCircleMore,
  Push: Smartphone,
} satisfies Record<TemplateChannel, typeof Mail>;

const panelGlassClass = "bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

export function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeChannel, setActiveChannel] = React.useState<(typeof channelOptions)[number]>("All");
  const [search, setSearch] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createStep, setCreateStep] = React.useState<"channel" | "email-format">("channel");
  const [deletingTemplateId, setDeletingTemplateId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/templates")
      .then((response) => response.ok ? response.json() : { templates: [] })
      .then((payload: { templates?: Array<{ id: string; name: string; description: string | null; channel: TemplateChannel; text_content: string | null }> }) => {
        if (cancelled) return;
        setTemplates((payload.templates ?? []).map((template) => ({ id: template.id, name: template.name, description: template.description ?? "No description", channel: `${template.channel.charAt(0).toUpperCase()}${template.channel.slice(1)}` as TemplateChannel, body: template.text_content ?? "" })));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const deleteTemplate = async (template: Template) => {
    if (!window.confirm(`Delete “${template.name}”? This cannot be undone.`)) return;
    setDeletingTemplateId(template.id);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete template");
      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete template");
    } finally {
      setDeletingTemplateId(null);
    }
  };

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
          </div>
          <button type="button" onClick={() => { setCreateStep("channel"); setIsCreateOpen(true); }} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#2a2a2a]"><Plus className="h-4 w-4" /> Create template</button>
        </header>

        <section className={cn("overflow-hidden rounded-[28px]", panelGlassClass)}>
          <div className="flex flex-col gap-5 border-b border-[#eeeeee] px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Your templates</h2>
                <p className="mt-1 text-[12px] text-[#909090]">Message building blocks for email, SMS, and push notifications</p>
                {error ? <p role="alert" className="mt-2 text-[12px] text-red-500">{error}</p> : null}
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

          {isLoading ? (
            <div className="overflow-x-auto" aria-label="Loading templates" aria-busy="true">
              <table className="w-full min-w-[720px] text-left" aria-hidden="true">
                <thead><tr className="border-b border-[#f1f1f1] text-[10px] uppercase tracking-[0.1em] text-[#a0a0a0]"><th className="px-6 py-3 font-medium">Template</th><th className="px-4 py-3 font-medium">Channel</th><th className="px-4 py-3 font-medium">Description</th><th className="px-4 py-3 font-medium">Content preview</th><th className="w-12 px-4 py-3" /></tr></thead>
                <tbody>
                  {Array.from({ length: 5 }, (_, index) => <tr key={index} className="border-b border-[#f3f3f3] last:border-0"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-[#eeeeee]" /><span className="h-3 w-32 animate-pulse rounded-full bg-[#eeeeee]" /></div></td><td className="px-4 py-4"><span className="block h-5 w-14 animate-pulse rounded-full bg-[#eeeeee]" /></td><td className="px-4 py-4"><span className="block h-3 w-40 animate-pulse rounded-full bg-[#eeeeee]" /></td><td className="px-4 py-4"><span className="block h-3 w-52 animate-pulse rounded-full bg-[#eeeeee]" /></td><td className="px-4 py-4"><span className="ml-auto block h-4 w-4 animate-pulse rounded bg-[#eeeeee]" /></td></tr>)}
                </tbody>
              </table>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="px-6 py-20 text-center sm:px-10">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f0ff] text-[#7258c9]"><FileText className="h-5 w-5" strokeWidth={1.5} /></span>
              <h3 className="mt-5 text-[15px] font-medium text-[#222]">{templates.length === 0 ? "No templates yet" : "No matching templates"}</h3>
              <p className="mx-auto mt-2 max-w-[390px] text-[12px] font-light leading-5 text-[#999]">{templates.length === 0 ? "Create a reusable message to use in your workflows and campaigns." : "Try a different search term or channel."}</p>
              {templates.length === 0 ? <button type="button" onClick={() => { setCreateStep("channel"); setIsCreateOpen(true); }} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#e2e2e2] bg-white px-3.5 py-2.5 text-[12px] font-medium text-[#444] transition hover:bg-[#f8f8f8]"><Plus className="h-3.5 w-3.5" /> Create your first template</button> : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead><tr className="border-b border-[#f1f1f1] text-[10px] uppercase tracking-[0.1em] text-[#a0a0a0]"><th className="px-6 py-3 font-medium">Template</th><th className="px-4 py-3 font-medium">Channel</th><th className="px-4 py-3 font-medium">Description</th><th className="px-4 py-3 font-medium">Content preview</th><th className="w-12 px-4 py-3" /></tr></thead>
                <tbody>
                  {filteredTemplates.map((template) => {
                    const Icon = channelIcons[template.channel];
                    const openTemplate = () => router.push(`/templates/${template.id}`);
                    return <tr key={template.id} role="link" tabIndex={0} onClick={openTemplate} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTemplate(); } }} className="group cursor-pointer border-b border-[#f3f3f3] transition-colors last:border-0 hover:bg-white/70 focus:bg-white/70 focus:outline-none"><td className="px-6 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f5] text-[#555] transition group-hover:bg-[#eeeeee]"><Icon className="h-4 w-4" strokeWidth={1.7} /></span><p className="truncate text-[13px] font-medium text-[#222]">{template.name}</p></div></td><td className="px-4 py-4"><span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10px] font-medium text-[#666]">{template.channel}</span></td><td className="max-w-[250px] px-4 py-4"><p className="truncate text-[12px] text-[#777]">{template.description}</p></td><td className="max-w-[280px] px-4 py-4"><p className="truncate text-[11px] text-[#999]">{template.body || "No content yet"}</p></td><td className="px-4 py-4"><div className="flex items-center justify-end gap-1"><button type="button" disabled={deletingTemplateId === template.id} onClick={(event) => { event.stopPropagation(); void deleteTemplate(template); }} onKeyDown={(event) => event.stopPropagation()} aria-label={`Delete ${template.name}`} className="rounded-md p-1.5 text-[#b4b4b4] opacity-0 transition hover:bg-[#fff1f1] hover:text-[#c15b5b] group-hover:opacity-100 focus:opacity-100 disabled:cursor-wait disabled:opacity-50"><Trash2 className="h-4 w-4" /></button><ChevronRight className="h-4 w-4 text-[#b4b4b4] transition group-hover:translate-x-0.5 group-hover:text-[#555]" /></div></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isCreateOpen ? <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="create-template-title" className="w-full max-w-lg rounded-[26px] bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.18)]"><div className="flex items-start justify-between gap-4"><div><h2 id="create-template-title" className="text-[18px] font-semibold tracking-[-0.03em] text-[#111]">{createStep === "email-format" ? "How would you like to create it?" : "What kind of template?"}</h2><p className="mt-1 text-[12px] text-[#8c8c8c]">{createStep === "email-format" ? "Choose the format for your email message." : "Choose a channel to start building your message."}</p></div><button type="button" onClick={() => setIsCreateOpen(false)} aria-label="Close" className="rounded-full p-2 text-[#999] transition hover:bg-[#f4f4f4] hover:text-[#444]"><X className="h-4 w-4" /></button></div><AnimatePresence mode="popLayout" initial={false}><motion.div key={createStep} layout className="mt-6 grid gap-4 sm:grid-cols-3" initial={{ opacity: 0, x: createStep === "email-format" ? 12 : -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: createStep === "email-format" ? -12 : 12 }} transition={{ duration: 0.22, ease: "easeOut" }}>{createStep === "channel" ? (["Email", "SMS", "Push"] as TemplateChannel[]).map((option) => { const Icon = channelIcons[option]; return <motion.button layout key={option} type="button" onClick={() => option === "Email" ? setCreateStep("email-format") : router.push(`/templates/new/${option.toLowerCase()}`)} className="group flex h-[156px] flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/75 px-3 text-center shadow-[0_8px_28px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-white hover:bg-white/90 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,1)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f5f5] text-[#555] transition group-hover:bg-[#eee]"><Icon className="h-5 w-5" strokeWidth={1.6} /></span><span className="mt-3 text-[13px] font-medium text-[#333]">{option}</span><span className="mt-1 text-[11px] text-[#999]">{option === "Email" ? "Choose a format next" : option === "SMS" ? "Short messages" : "App notifications"}</span></motion.button>; }) : <><motion.button layout type="button" onClick={() => setCreateStep("channel")} className="group flex h-[156px] flex-col items-center justify-center rounded-2xl border border-[var(--kenoo-sky)]/35 bg-[var(--kenoo-sky)]/10 p-5 text-center shadow-[0_8px_28px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-[var(--kenoo-sky)]/20 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--kenoo-sky)]/20 text-[var(--kenoo-sky)]"><Mail className="h-5 w-5" strokeWidth={1.6} /></span><span className="mt-4 block text-[13px] font-medium text-[#333]">Email</span><span className="mt-1 block text-[11px] text-[#777]">Choose a format</span></motion.button><motion.button layout type="button" onClick={() => router.push("/templates/new/email?format=plain")} className="group flex h-[156px] flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/75 p-5 text-center shadow-[0_8px_28px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f5f5] text-[18px] font-medium text-[#555]">T</span><span className="mt-4 block text-[13px] font-medium text-[#333]">Plain text</span><span className="mt-1 block text-[11px] leading-5 text-[#999]">Simple, plain text</span></motion.button><motion.button layout type="button" onClick={() => router.push("/templates/new/email?format=html")} className="group flex h-[156px] flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/75 p-5 text-center shadow-[0_8px_28px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf5ff] text-[18px] font-medium text-[#4776b8]">✦</span><span className="mt-4 block text-[13px] font-medium text-[#333]">HTML email</span><span className="mt-1 block text-[11px] leading-5 text-[#999]">Email builder</span></motion.button></>}</motion.div></AnimatePresence></div></div> : null}
    </div>
  );
}
