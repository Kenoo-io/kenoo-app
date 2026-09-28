"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@walls/ui/dropdown-menu";
import { cn } from "@walls/utils";

export type EventPresetOption = {
  id: string;
  key?: string;
  name: string;
  description: string;
  category: string;
};

export function EventPresetSelect({ presets, value, onChange }: { presets: EventPresetOption[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const selectedPreset = presets.find((preset) => preset.id === value);
  const selectedLabel = value === "custom" ? "Custom event" : selectedPreset?.name ?? "Select an event type";
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPresets = presets.filter((preset) => [preset.name, preset.description, preset.category, preset.key].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery));
  const customMatches = !normalizedQuery || ["custom event", "define your own event name and key"].some((value) => value.includes(normalizedQuery));
  const selectOption = (nextValue: string) => {
    setSearchQuery("");
    onChange(nextValue);
  };

  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2 bg-kenoo-white px-1.5 text-[11px] font-light leading-none text-neutral-500">Event type</span>
        <DropdownMenuTrigger asChild>
          <span aria-hidden="true" className="pointer-events-none absolute inset-0" />
        </DropdownMenuTrigger>
        {open ? (
          <input ref={searchInputRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => event.stopPropagation()} className="h-12 w-full cursor-text rounded-2xl border border-[var(--kenoo-sky)] bg-kenoo-white px-4 text-sm font-light text-foreground outline-none" aria-label="Search event types" />
        ) : (
          <button type="button" onClick={() => setOpen(true)} className={cn("flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border bg-kenoo-white px-4 text-left text-sm font-light outline-none transition-colors hover:bg-neutral-50", "border-[#e5e5e5]", !value && "text-neutral-500")} aria-label="Event type">
            <span className="truncate">{selectedLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
          </button>
        )}
      </div>
      <DropdownMenuContent align="start" sideOffset={8} onFocusOutside={(event) => event.preventDefault()} className="z-[240] max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[280px] overflow-y-auto rounded-2xl border border-neutral-200 bg-kenoo-white p-2 shadow-xl">
        <div className="space-y-0.5">
          {filteredPresets.map((preset) => (
            <DropdownMenuItem key={preset.id} onSelect={() => selectOption(preset.id)} className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-neutral-50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{preset.name}</p>
                <p className="mt-0.5 truncate text-xs font-light text-neutral-500">{preset.description}</p>
              </div>
              {value === preset.id && <Check className="ml-3 h-4 w-4 shrink-0 text-foreground" strokeWidth={2.75} />}
            </DropdownMenuItem>
          ))}
          {customMatches && <DropdownMenuItem onSelect={() => selectOption("custom")} className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-neutral-50">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Custom event</p>
              <p className="mt-0.5 text-xs font-light text-neutral-500">Define your own event name and key</p>
            </div>
            {value === "custom" && <Check className="ml-3 h-4 w-4 shrink-0 text-foreground" strokeWidth={2.75} />}
          </DropdownMenuItem>}
          {filteredPresets.length === 0 && !customMatches && <p className="px-3 py-4 text-center text-sm font-light text-neutral-500">No event types found</p>}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
