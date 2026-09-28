"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, ChevronsUpDown, MoreVertical, Plus, X } from "lucide-react";

import { FloatingLabelInput, FloatingLabelTextarea } from "./floating-label-fields";

type FlowEvent = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  payload_schema: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

type SortColumn = "name" | "key" | "description" | "status" | "created";

export function MetricsPage() {
  const [events, setEvents] = React.useState<FlowEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<FlowEvent | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/events");
    if (!response.ok) {
      setError("Unable to load events");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { events?: FlowEvent[] };
    setEvents(payload.events ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void loadEvents(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadEvents]);

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortColumn(column);
    setSortDirection(column === "created" ? "desc" : "asc");
  };

  const sortedEvents = [...events].sort((a, b) => {
      const values: Record<SortColumn, (event: FlowEvent) => string | number> = {
        name: (event) => event.name.toLowerCase(),
        key: (event) => event.key,
        description: (event) => event.description?.toLowerCase() ?? "",
        status: (event) => event.is_active ? 1 : 0,
        created: (event) => new Date(event.created_at).getTime(),
      };
      const first = values[sortColumn](a);
      const second = values[sortColumn](b);
      if (first < second) return sortDirection === "asc" ? -1 : 1;
      if (first > second) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="flex h-full min-h-0 flex-col bg-kenoo-white">
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-8 pb-6 md:px-10 md:pt-10">
        <div className="mb-5 flex shrink-0 flex-wrap items-center gap-3">
          <Link href="/analytics" className="group flex h-10 w-10 shrink-0 items-center justify-center text-neutral-500" aria-label="Back to analytics"><span className="rounded-full p-3 transition-colors group-hover:bg-neutral-100"><ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.5} /></span></Link>
          <div className="mr-2"><h1 className="text-xl font-medium tracking-tight text-neutral-800">Events</h1><p className="mt-0.5 text-xs font-light text-neutral-400">Customer moments your flows can respond to</p></div>
          <button type="button" onClick={() => setIsCreateOpen(true)} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"><Plus className="h-4 w-4" /> Create event</button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto scrollbar-hide">
          <table className="w-full min-w-[760px] table-fixed text-sm"><colgroup><col className="w-[28%]" /><col className="w-[20%]" /><col className="w-[30%]" /><col className="w-[12%]" /><col className="w-[10%]" /></colgroup><thead className="sticky top-0 z-10 border-b border-neutral-100 bg-kenoo-white"><tr><SortableHeader label="Name" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} /><SortableHeader label="Event key" column="key" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} indented /><SortableHeader label="Description" column="description" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} indented /><SortableHeader label="Status" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} indented /><SortableHeader label="Created" column="created" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} indented /></tr></thead>
            <tbody>{loading ? Array.from({ length: 7 }).map((_, rowIndex) => <tr key={rowIndex} className="border-b border-neutral-50"><td colSpan={5} className="py-4 pr-4"><div className="h-4 animate-pulse rounded bg-neutral-100" /></td></tr>) : error ? <tr><td colSpan={5} className="py-16 text-center text-sm font-light text-red-400">{error}</td></tr> : sortedEvents.length === 0 ? <tr><td colSpan={5}><EmptyEvents onCreate={() => setIsCreateOpen(true)} /></td></tr> : sortedEvents.map((event) => <EventRow key={event.id} event={event} menuOpen={openMenuId === event.id} onMenuToggle={() => setOpenMenuId((current) => current === event.id ? null : event.id)} onEdit={() => { setEditingEvent(event); setOpenMenuId(null); }} onArchive={async () => { setOpenMenuId(null); await updateEvent(event.id, { isActive: event.is_active ? false : true }, setEvents); }} onDelete={async () => { if (!window.confirm(`Delete “${event.name}”? This cannot be undone.`)) return; setOpenMenuId(null); await deleteEvent(event.id, setEvents); }} />)}</tbody>
          </table>
        </div>
      </div>
      {(isCreateOpen || editingEvent) && <CreateEventModal initialEvent={editingEvent} onClose={() => { setIsCreateOpen(false); setEditingEvent(null); }} onCreated={(event) => { setEvents((current) => editingEvent ? current.map((item) => item.id === event.id ? event : item) : [...current, event]); setIsCreateOpen(false); setEditingEvent(null); }} />}
    </div>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort, indented }: { label: string; column: SortColumn; sortColumn: SortColumn; sortDirection: "asc" | "desc"; onSort: (column: SortColumn) => void; indented?: boolean }) {
  const active = sortColumn === column;
  const SortIcon = !active ? ChevronsUpDown : sortDirection === "asc" ? ChevronUp : ChevronDown;
  return <th className={`relative bg-kenoo-white py-3 pr-4 text-left text-xs font-medium tracking-wide whitespace-nowrap text-neutral-400 uppercase select-none ${indented ? "pl-3" : ""}`}><button type="button" onClick={() => onSort(column)} className={`inline-flex max-w-full items-center gap-1 border-0 bg-transparent p-0 pr-3 font-medium tracking-wide uppercase transition-colors hover:text-neutral-700 ${active ? "text-neutral-700" : "text-neutral-400"}`}><span className="truncate">{label}</span><SortIcon className={`h-3 w-3 shrink-0 ${active ? "opacity-100" : "opacity-40"}`} strokeWidth={1.75} /></button></th>;
}

function EventRow({ event, menuOpen, onMenuToggle, onEdit, onArchive, onDelete }: { event: FlowEvent; menuOpen: boolean; onMenuToggle: () => void; onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  return <tr className="group border-b border-neutral-50 transition-colors hover:bg-neutral-50/60"><td className="overflow-hidden py-4 pr-4"><span className="block truncate text-sm font-medium text-neutral-800">{event.name}</span></td><td className="overflow-hidden py-4 pr-4 pl-3"><span className="block truncate font-mono text-xs font-light text-neutral-500">{event.key}</span></td><td className="overflow-hidden py-4 pr-4 pl-3"><span className="block truncate text-xs font-light text-neutral-500">{event.description || "-"}</span></td><td className="overflow-hidden py-4 pr-4 pl-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${event.is_active ? "bg-[#eef8f1] text-[#27825a]" : "bg-neutral-100 text-neutral-500"}`}>{event.is_active ? "Active" : "Archived"}</span></td><td className="relative overflow-visible py-4 pr-4 pl-3"><div className="flex items-center justify-between gap-2"><span className="whitespace-nowrap text-xs font-light text-neutral-500">{formatDate(event.created_at)}</span><div className="relative"><button type="button" onClick={onMenuToggle} className={`rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 ${menuOpen ? "bg-neutral-100 text-neutral-700" : "opacity-0 group-hover:opacity-100"}`} aria-label={`More options for ${event.name}`} aria-expanded={menuOpen}><MoreVertical className="h-4 w-4" /></button>{menuOpen && <div className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"><button type="button" onClick={onEdit} className="flex w-full px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50">Edit event</button><button type="button" onClick={onArchive} className="flex w-full px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50">{event.is_active ? "Archive event" : "Restore event"}</button><button type="button" onClick={onDelete} className="flex w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50">Delete event</button></div>}</div></div></td></tr>;
}

async function updateEvent(id: string, updates: { isActive?: boolean }, setEvents: React.Dispatch<React.SetStateAction<FlowEvent[]>>) {
  const response = await fetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
  if (!response.ok) return;
  const payload = (await response.json()) as { event?: FlowEvent };
  if (payload.event) setEvents((current) => current.map((event) => event.id === id ? payload.event! : event));
}

async function deleteEvent(id: string, setEvents: React.Dispatch<React.SetStateAction<FlowEvent[]>>) {
  const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
  if (response.ok) setEvents((current) => current.filter((event) => event.id !== id));
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }

function EmptyEvents({ onCreate }: { onCreate: () => void }) {
  return <div className="px-7 py-16 text-center"><h3 className="text-sm font-medium text-neutral-700">No events yet</h3><p className="mx-auto mt-2 max-w-[330px] text-xs font-light leading-5 text-neutral-400">Create an event to give your flows a customer moment to respond to.</p><button type="button" onClick={onCreate} className="mt-5 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-neutral-700"><Plus className="h-3.5 w-3.5" /> Create your first event</button></div>;
}

function CreateEventModal({ initialEvent, onClose, onCreated }: { initialEvent: FlowEvent | null; onClose: () => void; onCreated: (event: FlowEvent) => void }) {
  const [name, setName] = React.useState(initialEvent?.name ?? "");
  const [key, setKey] = React.useState(initialEvent?.key ?? "");
  const [description, setDescription] = React.useState(initialEvent?.description ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await fetch(initialEvent ? `/api/events/${initialEvent.id}` : "/api/events", { method: initialEvent ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, key, description }) });
    const payload = (await response.json().catch(() => ({}))) as { event?: FlowEvent; error?: string };
    if (!response.ok || !payload.event) { setError(payload.error ?? "Unable to create event"); setSubmitting(false); return; }
    onCreated(payload.event);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-kenoo-white p-5 shadow-xl"><div className="flex items-start justify-between"><h2 className="text-lg font-semibold text-neutral-950">{initialEvent ? "Edit event" : "Create event"}</h2><button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700" aria-label="Close"><X className="h-4 w-4" /></button></div><form onSubmit={submit} className="mt-2"><FloatingLabelInput required label="Name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" className="mt-2" /><FloatingLabelInput required label="Event key" value={key} onChange={(event) => setKey(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} autoComplete="off" className="mt-2 font-mono" /><FloatingLabelTextarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2" />{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200">Cancel</button><button type="submit" disabled={submitting} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? (initialEvent ? "Saving…" : "Creating…") : (initialEvent ? "Save" : "Create event")}</button></div></form></div></div>;
}
