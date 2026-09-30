"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, GitBranch, Mail, Plus, Save, Sparkles, Trash2, Zap } from "lucide-react";

import { FloatingLabelInput, FloatingLabelSelect, FloatingLabelTextarea } from "./floating-label-fields";

type FlowEvent = { id: string; key: string; name: string; description: string | null; is_active: boolean };
type WorkflowDefinition = { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
type FlowStep =
  | { id: string; type: "delay"; value: string; unit: string }
  | { id: string; type: "email"; subject: string; preview: string };

export function FlowBuilderPage() {
  const [events, setEvents] = React.useState<FlowEvent[]>([]);
  const [triggerKey, setTriggerKey] = React.useState("checkout_started");
  const [steps, setSteps] = React.useState<FlowStep[]>([
    { id: "delay-1", type: "delay", value: "60", unit: "minutes" },
    { id: "email-1", type: "email", subject: "Did you forget something?", preview: "We saved your checkout for you. Come back whenever you’re ready." },
  ]);
  const [insertPosition, setInsertPosition] = React.useState<number | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [workflowId, setWorkflowId] = React.useState<string | null>(null);

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

  const updateStep = (stepId: string, updates: Partial<FlowStep>) => {
    setSteps((current) => current.map((step) => step.id === stepId ? { ...step, ...updates } as FlowStep : step));
    setSaved(false);
  };

  const deleteStep = (stepId: string) => {
    setSteps((current) => current.filter((step) => step.id !== stepId));
    setSaved(false);
  };

  const addStep = (type: FlowStep["type"]) => {
    if (insertPosition === null) return;
    const newStep: FlowStep = type === "delay"
      ? { id: `delay-${Date.now()}`, type, value: "60", unit: "minutes" }
      : { id: `email-${Date.now()}`, type, subject: "Your next step", preview: "Add a preview for this email." };
    setSteps((current) => {
      const next = [...current];
      next.splice(insertPosition, 0, newStep);
      return next;
    });
    setInsertPosition(null);
    setSaved(false);
  };

  const buildDefinition = (): WorkflowDefinition => {
    const nodeIds = ["trigger", ...steps.map((step) => step.id)];
    return {
      nodes: [
        { id: "trigger", type: "event_trigger", data: { eventKey: triggerKey, eventName: triggerName } },
        ...steps.map((step) => step.type === "delay"
          ? { id: step.id, type: "delay", data: { value: Number(step.value) || 0, unit: step.unit } }
          : { id: step.id, type: "send_email", data: { subject: step.subject, preview: step.preview } }),
      ],
      edges: nodeIds.slice(0, -1).map((source, index) => ({ id: `${source}-${nodeIds[index + 1]}`, source, target: nodeIds[index + 1] })),
    };
  };

  const saveWorkflow = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(workflowId ? `/api/workflows/${workflowId}` : "/api/workflows", {
        method: workflowId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled flow", triggerEventId: selectedEvent?.id ?? null, definition: buildDefinition() }),
      });
      const payload = (await response.json().catch(() => ({}))) as { workflow?: { id: string }; error?: string };
      if (!response.ok || !payload.workflow) throw new Error(payload.error ?? "Unable to save flow");
      setWorkflowId(payload.workflow.id);
      setSaved(true);
    } catch (error) {
      setSaved(false);
      setSaveError(error instanceof Error ? error.message : "Unable to save flow");
    } finally {
      setSaving(false);
    }
  };

  return <div className="flex h-screen min-h-0 flex-col bg-[#f8f8f7]">
    <header className="flex shrink-0 items-center justify-between bg-kenoo-white px-5 py-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3"><Link href="/flows" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#777] transition hover:bg-[#f2f2f2]" aria-label="Back to flows"><ArrowLeft className="h-4 w-4" /></Link><div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#a0a0a0]">Flow builder</p><h1 className="truncate text-[18px] font-semibold tracking-[-0.03em] text-[#171717]">Create flow</h1></div></div>
      <div className="flex items-center gap-3"><span className={`hidden text-[11px] sm:inline ${saveError ? "text-red-500" : "text-[#999]"}`}>{saveError ?? (saved ? "Draft saved" : "Unsaved draft")}</span><button type="button" disabled={saving} onClick={() => void saveWorkflow()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#111] px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-wait disabled:opacity-60"><Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save draft"}</button></div>
    </header>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#eeeeec] xl:flex-row">
      <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-hide bg-transparent bg-[radial-gradient(#d2d2d0_1px,transparent_1px)] [background-size:22px_22px]">
        <div className="relative mx-auto flex max-w-[760px] flex-col items-center px-5 py-12 sm:py-16">
          <div className="mb-8 text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f6ed] text-[#218052]"><GitBranch className="h-5 w-5" strokeWidth={1.5} /></div><h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#222]">Build your customer journey</h2><p className="mt-2 max-w-[430px] text-[12px] leading-5 text-[#858585]">Start with something that happens, then connect the next best action with timing and conditions.</p></div>
          <FlowNode eyebrow="When this happens" title="Event trigger" icon={Zap} iconClass="bg-[#fff3d5] text-[#9a6b08]" className="z-30 w-full max-w-[500px]"><EventPicker events={events} value={triggerKey} fallbackName={triggerName} onChange={(value) => { setTriggerKey(value); setSaved(false); }} /></FlowNode>
          <Connector onPlus={() => setInsertPosition(0)} />
          {steps.map((step, index) => <React.Fragment key={step.id}>
            {step.type === "delay" ? <FlowNode eyebrow="Then wait" title="Delay" icon={Clock3} iconClass="bg-[#edf3ff] text-[#4b70b4]" onDelete={() => deleteStep(step.id)} className="w-full max-w-[500px]"><div className="flex flex-wrap items-center gap-2"><div className="w-24"><FloatingLabelInput label="Amount" type="number" min="1" value={step.value} onChange={(event) => updateStep(step.id, { value: event.target.value })} /></div><FloatingLabelSelect label="Unit" value={step.unit} onChange={(value) => updateStep(step.id, { unit: value })} options={[{ value: "minutes", label: "Minutes" }, { value: "hours", label: "Hours" }, { value: "days", label: "Days" }]} /><span className="text-[12px] text-[#888]">after the previous step</span></div></FlowNode> : <FlowNode eyebrow="Then do this" title="Send an email" icon={Mail} iconClass="bg-[#e9f7f0] text-[#238252]" onDelete={() => deleteStep(step.id)} className="w-full max-w-[500px]"><div className="space-y-3"><FloatingLabelInput label="Subject" value={step.subject} onChange={(event) => updateStep(step.id, { subject: event.target.value })} autoComplete="off" /><FloatingLabelTextarea label="Preview text" value={step.preview} onChange={(event) => updateStep(step.id, { preview: event.target.value })} /></div></FlowNode>}
            {index < steps.length - 1 ? <Connector onPlus={() => setInsertPosition(index + 1)} /> : null}
          </React.Fragment>)}
          <button type="button" onClick={() => setInsertPosition(steps.length)} className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#cfcfcd] bg-white/70 px-3.5 py-2 text-[11px] font-medium text-[#777] transition hover:border-[#aaa] hover:bg-white"><Plus className="h-3.5 w-3.5" /> Add another step</button>
          <StepPicker open={insertPosition !== null} onSelect={addStep} onClose={() => setInsertPosition(null)} />
        </div>
      </main>
      <aside className="w-full shrink-0 overflow-y-auto scrollbar-hide bg-kenoo-white p-5 xl:h-full xl:w-[310px] xl:p-6"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#a0a0a0]">Flow overview</p><h2 className="mt-2 text-[17px] font-semibold tracking-[-0.03em] text-[#222]">{triggerName} → {steps.length} step{steps.length === 1 ? "" : "s"}</h2><p className="mt-2 text-[12px] leading-5 text-[#858585]">People who trigger this event will move through each step in order.</p><div className="mt-6 space-y-3"><OverviewItem number="1" icon={Zap} title={triggerName} detail="Event trigger" />{steps.map((step, index) => <OverviewItem key={step.id} number={`${index + 2}`} icon={step.type === "delay" ? Clock3 : Mail} title={step.type === "delay" ? `${step.value || "—"} ${step.unit}` : "Send an email"} detail={step.type === "delay" ? "Wait" : step.subject || "Add a subject"} />)}</div><div className="mt-7 rounded-2xl bg-[#f6f8f6] p-4"><div className="flex items-center gap-2 text-[#238252]"><Sparkles className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">Next step</span></div><p className="mt-2 text-[11px] leading-5 text-[#777]">Use the plus buttons between nodes to add more waits or email actions to this journey.</p></div></aside>
    </div>
  </div>;
}

function FlowNode({ eyebrow, title, icon: Icon, iconClass, onDelete, className, children }: { eyebrow: string; title: string; icon: typeof Zap; iconClass: string; onDelete?: () => void; className?: string; children: React.ReactNode }) {
  return <section className={`relative rounded-[24px] border border-[#e4e4e2] bg-white/90 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6 ${className ?? ""}`}><div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}><Icon className="h-4 w-4" strokeWidth={1.7} /></span><div><p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#a0a0a0]">{eyebrow}</p><h3 className="mt-1 text-[15px] font-semibold text-[#222]">{title}</h3></div></div>{onDelete ? <button type="button" onClick={onDelete} className="rounded-lg p-2 text-[#b4b4b4] transition hover:bg-[#fff1f1] hover:text-[#c15b5b]" aria-label={`Delete ${title} step`}><Trash2 className="h-4 w-4" /></button> : null}</div>{children}</section>;
}

function Connector({ onPlus }: { onPlus: () => void }) {
  return <div className="relative flex h-14 items-center justify-center"><div className="h-full w-px bg-[#c8c8c5]" /><button type="button" onClick={onPlus} className="absolute flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[#cfcfcd] bg-white/80 text-[#888] transition hover:border-[#9eb9a7] hover:bg-[#f5fbf7] hover:text-[#238252]" aria-label="Add a step here"><Plus className="h-3.5 w-3.5" /></button></div>;
}

function StepPicker({ open, onSelect, onClose }: { open: boolean; onSelect: (type: FlowStep["type"]) => void; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="w-full max-w-sm rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#999]">Add step</p><h2 className="mt-1 text-lg font-semibold text-[#222]">What should happen next?</h2></div><button type="button" onClick={onClose} className="text-xl leading-none text-[#aaa]" aria-label="Close">×</button></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => onSelect("delay")} className="rounded-xl border border-[#e5e5e5] p-4 text-left transition hover:border-[#b8d9c3] hover:bg-[#f8fcfa]"><Clock3 className="h-4 w-4 text-[#4b70b4]" /><p className="mt-3 text-sm font-medium text-[#333]">Wait</p><p className="mt-1 text-xs text-[#888]">Pause before the next step.</p></button><button type="button" onClick={() => onSelect("email")} className="rounded-xl border border-[#e5e5e5] p-4 text-left transition hover:border-[#b8d9c3] hover:bg-[#f8fcfa]"><Mail className="h-4 w-4 text-[#238252]" /><p className="mt-3 text-sm font-medium text-[#333]">Send an email</p><p className="mt-1 text-xs text-[#888]">Deliver a message to the person.</p></button></div></div></div>;
}

function EventPicker({ events, value, fallbackName, onChange }: { events: FlowEvent[]; value: string; fallbackName: string; onChange: (value: string) => void }) {
  const options = events.filter((event) => event.is_active);
  const hasSelectedEvent = options.some((event) => event.key === value);
  const selectOptions = [...(!hasSelectedEvent && value ? [{ value, label: fallbackName }] : []), ...options.map((event) => ({ value: event.key, label: event.name }))];
  return <FloatingLabelSelect label="Event" value={value} onChange={onChange} options={selectOptions} className="w-full max-w-[380px]" />;
}

function OverviewItem({ number, icon: Icon, title, detail }: { number: string; icon: typeof Zap; title: string; detail: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-[#ededeb] bg-white px-3 py-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f2f5f2] text-[10px] font-medium text-[#666]">{number}</span><Icon className="h-3.5 w-3.5 shrink-0 text-[#7a9b86]" strokeWidth={1.7} /><div className="min-w-0"><p className="truncate text-[11px] font-medium text-[#444]">{title}</p><p className="truncate text-[10px] text-[#999]">{detail}</p></div></div>;
}
