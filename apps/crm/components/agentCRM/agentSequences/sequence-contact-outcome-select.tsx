"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SEQUENCE_PEOPLE_OUTCOME_OPTIONS,
  outcomeToSelectValue,
  selectValueToOutcome,
} from "@/components/agentCRM/agentSequences/sequence-contact-outcome-popup";

export interface SequenceContactOutcomeSelectProps {
  value: string | null;
  onValueChange: (outcome: string | null) => void;
  className?: string;
  disabled?: boolean;
}

export function SequenceContactOutcomeSelect({
  value,
  onValueChange,
  className,
  disabled = false,
}: SequenceContactOutcomeSelectProps) {
  return (
    <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
      <Select
        value={outcomeToSelectValue(value)}
        onValueChange={(next) => onValueChange(selectValueToOutcome(next))}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-full min-w-0 border-0 bg-transparent px-0 py-0 text-xs font-light shadow-none ring-0 focus:ring-0 focus:ring-offset-0 [&>span]:truncate",
            value ? "text-neutral-700" : "text-neutral-400",
            className,
          )}
        >
          <SelectValue placeholder="Set outcome" />
        </SelectTrigger>
        <SelectContent align="start" className="min-w-[10rem]">
          <SelectGroup>
            {SEQUENCE_PEOPLE_OUTCOME_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value} className="text-xs font-light">
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
