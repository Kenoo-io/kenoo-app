"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Clock3, GitBranch, Mail, Plus, Save, Sparkles, Zap } from "lucide-react";

type FlowEvent = { id: string; key: string; name: string; description: string | null; is_active: boolean };

export function FlowBuilderPage() {
  const [events, setEvents] = React.useState<FlowEvent[]>([]);
  const [triggerKey, setTriggerKey] = React.useState("checkout_started");
  const [delayValue, setDelayValue] = React.useState("60");
  const [delayUnit, setDelayUnit] = React.useState("minutes");
  const [subject, setSubject] = React.useState("Did you forget something?");
  const [preview, setPreview] = React.useState("We saved your checkout for you. Come back whenever you’re ready.");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const loadEvents = async () => {
      const response = await fetch("/api/events");
      if (!response.ok) return;
      const payload = (await response.json()) as { events?: FlowEvent[] };
      setEvents(payload.events ?? []);
    };
    void loadEvents();
  }, []);

  const selectedEvent = events.find((event) => event.key === triggerKey);
  const triggerName = selectedEvent?.name ?? (triggerKey === "checkout_started" ? "Checkout started" : triggerKey);

  return <div className="flex h-screen min-h-0 flex-col bg-[#f8f8f7]">
    <header className="flex shrink-0 items-center justify-between bg-kenoo-white px-5 py-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3"><Link href="/flows" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#777] transition hover:bg-[#f2f2f2]" aria-label="Back to flows"><ArrowLeft className="h-4 w-4" /></Link><div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#a0a0a0]">Flow builder</p><h1 className="truncate text-[18px] font-semibold tracking-[-0.03em] text-[#171717]">Create flow</h1></div></div>
      <div className="flex items-center gap-3"><span className="hidden text-[11px] text-[#999] sm:inline">{saved ? "Draft saved locally" : "Unsaved draft"}</span><button type="button" onClick={() => setSaved(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#111] px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-[#2a2a2a]"><Save className="h-3.5 w-3.5" /> Save draft</button></div>
    </header>

    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#eeeeec] xl:flex-row">
      <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-hide bg-transparent bg-[radial-gradient(#d2d2d0_1px,transparent_1px)] [background-size:22px_22px]">
        <div className="relative mx-auto flex max-w-[760px] flex-col items-center px-5 py-12 sm:py-16">
          <div className="mb-8 text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f6ed] text-[#218052]"><GitBranch className="h-5 w-5" strokeWidth={1.5} /></div><h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#222]">Build your customer journey</h2><p className="mt-2 max-w-[430px] text-[12px] leading-5 text-[#858585]">Start with something that happens, then connect the next best action with timing and conditions.</p></div>

          <FlowNode eyebrow="When this happens" title="Event trigger" icon={Zap} iconClass="bg-[#fff3d5] text-[#9a6b08]" className="z-30 w-full max-w-[500px]">
            <EventPicker events={events} value={triggerKey} onChange={(value) => { setTriggerKey(value); setSaved(false); }} fallbackName={triggerName} />
          </FlowNode>
          <Connector />
          <FlowNode eyebrow="Then wait" title="Delay" icon={Clock3} iconClass="bg-[#edf3ff] text-[#4b70b4]" className="w-full max-w-[500px]">
            <div className="flex items-center gap-2"><input type="number" min="1" value={delayValue} onChange={(event) => { setDelayValue(event.target.value); setSaved(false); }} className="h-10 w-24 rounded-xl border border-[#e4e4e4] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#b8b8b8]" /><select value={delayUnit} onChange={(event) => { setDelayUnit(event.target.value); setSaved(false); }} className="h-10 rounded-xl border border-[#e4e4e4] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#b8b8b8]"><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select><span className="text-[12px] text-[#888]">after the event</span></div>
          </FlowNode>
          <Connector />
          <FlowNode eyebrow="Then do this" title="Send an email" icon={Mail} iconClass="bg-[#e9f7f0] text-[#238252]" className="w-full max-w-[500px]">
            <div className="space-y-3"><div><label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-[#999]">Subject</label><input value={subject} onChange={(event) => { setSubject(event.target.value); setSaved(false); }} className="h-10 w-full rounded-xl border border-[#e4e4e4] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#b8b8b8]" /></div><div><label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-[#999]">Preview text</label><textarea value={preview} onChange={(event) => { setPreview(event.target.value); setSaved(false); }} rows={3} className="w-full resize-none rounded-xl border border-[#e4e4e4] bg-white px-3 py-2.5 text-[13px] leading-5 text-[#333] outline-none focus:border-[#b8b8b8]" /></div></div>
          </FlowNode>
          <button type="button" className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#cfcfcd] bg-white/70 px-3.5 py-2 text-[11px] font-medium text-[#777] transition hover:border-[#aaa] hover:bg-white"><Plus className="h-3.5 w-3.5" /> Add another step</button>
        </div>
      </main>

      <aside className="w-full shrink-0 overflow-y-auto scrollbar-hide bg-kenoo-white p-5 xl:h-full xl:w-[310px] xl:p-6"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#a0a0a0]">Flow overview</p><h2 className="mt-2 text-[17px] font-semibold tracking-[-0.03em] text-[#222]">{triggerName} → email</h2><p className="mt-2 text-[12px] leading-5 text-[#858585]">People who trigger this event will receive an email after the delay you set.</p><div className="mt-6 space-y-3"><OverviewItem number="1" icon={Zap} title={triggerName} detail="Event trigger" /><OverviewItem number="2" icon={Clock3} title={`${delayValue || "—"} ${delayUnit}`} detail="Wait" /><OverviewItem number="3" icon={Mail} title="Send an email" detail={subject || "Add a subject"} /></div><div className="mt-7 rounded-2xl bg-[#f6f8f6] p-4"><div className="flex items-center gap-2 text-[#238252]"><Sparkles className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">Next step</span></div><p className="mt-2 text-[11px] leading-5 text-[#777]">We’ll add branching, audience conditions, and reusable email templates to this canvas next.</p></div></aside>
    </div>
  </div>;
}

function FlowNode({ eyebrow, title, icon: Icon, iconClass, className, children }: { eyebrow: string; title: string; icon: typeof Zap; iconClass: string; className?: string; children: React.ReactNode }) {
  return <section className={`relative rounded-[24px] border border-[#e4e4e2] bg-white/90 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6 ${className ?? ""}`}><div className="mb-5 flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}><Icon className="h-4 w-4" strokeWidth={1.7} /></span><div><p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#a0a0a0]">{eyebrow}</p><h3 className="mt-1 text-[15px] font-semibold text-[#222]">{title}</h3></div></div>{children}</section>;
}

function Connector() { return <div className="relative flex h-14 items-center justify-center"><div className="h-full w-px bg-[#c8c8c5]" /><span className="absolute flex h-6 w-6 items-center justify-center rounded-full border border-[#d8d8d5] bg-white text-[#aaa]"><Plus className="h-3 w-3" /></span></div>; }

function EventPicker({ events, value, onChange, fallbackName }: { events: FlowEvent[]; value: string; onChange: (value: string) => void; fallbackName: string }) {
  const [open, setOpen] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const options = events.filter((event) => event.is_active);
  React.useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);
  return <div ref={pickerRef} className="relative"><button type="button" onClick={() => setOpen((current) => !current)} className="flex h-11 w-full items-center justify-between rounded-xl border border-[#e4e4e4] bg-white px-3.5 text-left transition hover:border-[#bdbdbd]"><span><span className="block text-[13px] font-medium text-[#333]">{fallbackName}</span><span className="mt-0.5 block font-mono text-[10px] text-[#999]">{value}</span></span><ChevronDown className={`h-4 w-4 text-[#999] transition-transform ${open ? "rotate-180" : ""}`} /></button>{open ? <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-60 overflow-auto rounded-xl border border-[#e3e3e3] bg-white py-1 shadow-xl">{options.length ? options.map((event) => <button type="button" key={event.id} onClick={() => { onChange(event.key); setOpen(false); }} className="flex w-full flex-col px-3.5 py-2.5 text-left transition hover:bg-[#f7faf8]"><span className="text-[12px] font-medium text-[#333]">{event.name}</span><span className="mt-0.5 font-mono text-[10px] text-[#999]">{event.key}</span></button>) : <p className="px-3.5 py-3 text-[12px] text-[#999]">No active events yet.</p>}</div> : null}</div>;
}

function OverviewItem({ number, icon: Icon, title, detail }: { number: string; icon: typeof Zap; title: string; detail: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-[#ededeb] bg-white px-3 py-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f2f5f2] text-[10px] font-medium text-[#666]">{number}</span><Icon className="h-3.5 w-3.5 shrink-0 text-[#7a9b86]" strokeWidth={1.7} /><div className="min-w-0"><p className="truncate text-[11px] font-medium text-[#444]">{title}</p><p className="truncate text-[10px] text-[#999]">{detail}</p></div></div>;
}
