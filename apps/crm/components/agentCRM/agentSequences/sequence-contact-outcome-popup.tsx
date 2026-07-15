"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BorderlessSelect } from "@/components/agentRoster/create/sections/borderless-select";
import { createClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { wallsToast } from "@/components/ui/walls-toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const NONE_VALUE = "__none__";

export const SEQUENCE_PEOPLE_OUTCOME_OPTIONS = [
  { value: "deal_closed", label: "Deal closed" },
  { value: "interested", label: "Interested" },
  { value: "future_opportunity", label: "Future opportunity" },
  { value: "not_interested", label: "Not interested" },
  { value: "undeliverable", label: "Bounced" },
  { value: "no_response", label: "No Reply" },
  { value: "bad_fit", label: "Bad fit" },
  { value: NONE_VALUE, label: "No outcome" },
] as const;

export type SequencePeopleOutcome =
  | "deal_closed"
  | "interested"
  | "future_opportunity"
  | "not_interested"
  | "undeliverable"
  | "no_response"
  | "bad_fit";

export function sequenceOutcomeLabel(outcome: string | null | undefined): string {
  if (!outcome) return "No outcome";
  return (
    SEQUENCE_PEOPLE_OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label ?? outcome
  );
}

export function outcomeToSelectValue(outcome: string | null | undefined): string {
  return outcome ?? NONE_VALUE;
}

export function selectValueToOutcome(value: string): string | null {
  return value === NONE_VALUE ? null : value;
}

function resolveInitialSelectValue(outcomes: (string | null | undefined)[]): string {
  const normalized = outcomes.map((o) => outcomeToSelectValue(o ?? null));
  const unique = new Set(normalized);
  if (unique.size === 1) return normalized[0]!;
  return NONE_VALUE;
}

const popupButtonOuterClass =
  "h-9 min-w-[4.75rem] w-auto p-0 text-slate-600 hover:bg-transparent flex items-center justify-center shadow-none relative group flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed";
const popupButtonInnerClass =
  "relative z-10 inline-flex min-w-[4rem] items-center justify-center rounded-full px-3.5 py-2 transition-all duration-300 ease-in-out group-hover:bg-gray-50 group-hover:border group-hover:border-neutral-200 group-hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] group-hover:scale-95";

const FIELD_TITLE_CLASS =
  "mb-1.5 block text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";

export type SequenceContactOutcomeRow = {
  id: string;
  outcome: string | null;
  person?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export interface SequenceContactOutcomePopupProps {
  open: boolean;
  onClose: () => void;
  contacts: SequenceContactOutcomeRow[];
  onSaved: (contactIds: string[], outcome: string | null) => void;
}

function contactDisplayName(contact: SequenceContactOutcomeRow): string {
  const p = contact.person;
  const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (p?.email) return p.email;
  return "Contact";
}

export function SequenceContactOutcomePopup({
  open,
  onClose,
  contacts,
  onSaved,
}: SequenceContactOutcomePopupProps) {
  const [selectedValue, setSelectedValue] = useState<string>(NONE_VALUE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasMixedOutcomes = useMemo(() => {
    const normalized = contacts.map((c) => outcomeToSelectValue(c.outcome));
    return new Set(normalized).size > 1;
  }, [contacts]);

  const contactIds = useMemo(() => contacts.map((c) => c.id), [contacts]);

  useEffect(() => {
    if (!open || contacts.length === 0) return;
    setSelectedValue(resolveInitialSelectValue(contacts.map((c) => c.outcome)));
    setError(null);
    setSubmitting(false);
  }, [open, contacts]);

  async function handleSubmit() {
    if (contactIds.length === 0) return;
    setError(null);
    setSubmitting(true);

    const outcome = selectValueToOutcome(selectedValue);

    try {
      const { error: updateError } = await supabase
        .from("sequence_people")
        .update({ outcome })
        .in("id", contactIds);

      if (updateError) {
        console.error("[SequenceContactOutcomePopup] update failed:", updateError);
        setError("Could not save outcome. Please try again.");
        return;
      }

      wallsToast.success(
        contactIds.length === 1
          ? "Outcome saved"
          : `Outcome saved for ${contactIds.length} contacts`,
      );
      onSaved(contactIds, outcome);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    contacts.length === 1
      ? contactDisplayName(contacts[0])
      : `${contacts.length} contacts`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md [&>button]:focus:outline-none [&>button]:focus:ring-0 [&>button]:focus-visible:ring-0 [&>button]:ring-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight text-neutral-900">
            Outcome
          </DialogTitle>
          <p className="text-sm font-light text-neutral-500 pt-1 truncate">{title}</p>
        </DialogHeader>

        {contacts.length > 0 ? (
          <div className="space-y-6 py-1">
            {hasMixedOutcomes ? (
              <p className="text-xs font-light text-neutral-500">
                Selected contacts have different outcomes. Choose one to apply to all.
              </p>
            ) : null}

            {contacts.length > 1 && contacts.length <= 5 ? (
              <ul className="text-xs font-light text-neutral-600 space-y-1">
                {contacts.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3">
                    <span className="truncate">{contactDisplayName(c)}</span>
                    <span className="text-neutral-400 shrink-0">
                      {sequenceOutcomeLabel(c.outcome)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="min-w-0">
              <span id="sequence-outcome-label" className={FIELD_TITLE_CLASS}>
                Outcome
              </span>
              <div className={submitting ? "pointer-events-none opacity-50" : undefined}>
                <BorderlessSelect
                  value={selectedValue}
                  onValueChange={setSelectedValue}
                  placeholder="Select outcome"
                  items={[...SEQUENCE_PEOPLE_OUTCOME_OPTIONS]}
                />
              </div>
            </div>

            {error ? <p className="text-xs text-red-600 font-light">{error}</p> : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 pr-2 sm:gap-2 sm:justify-end sm:pr-3">
          <div className="flex w-full items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || contacts.length === 0}
              className={cn(popupButtonOuterClass, "translate-x-3 sm:translate-x-5")}
              aria-label="Save outcome"
            >
              <div className={popupButtonInnerClass}>
                {submitting ? (
                  <div className="h-4 w-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-xs font-light text-neutral-900 px-0.5">Save</span>
                )}
              </div>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
