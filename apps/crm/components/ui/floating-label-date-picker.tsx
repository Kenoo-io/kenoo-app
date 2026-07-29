"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";

import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/mini-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FloatingLabelField } from "@/components/ui/floating-label-input";

export type FloatingLabelDatePickerProps = {
  label: string;
  /** Accepts a `Date`, an ISO/`yyyy-MM-dd` string, or empty. */
  value?: Date | string | null;
  /** Emits `yyyy-MM-dd` (or `""` when cleared) to match the CRM form shape. */
  onChange: (value: string) => void;
  displayFormat?: string;
  disabled?: boolean;
  showClearButton?: boolean;
  clearLabel?: string;
  align?: "start" | "center" | "end";
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
  dealDates?: Date[];
};

/** Parses the loose date shapes the CRM forms hold without shifting timezone. */
export function parseFormDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const parsed = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
    return isValid(parsed) ? parsed : null;
  }

  const parsed = parseISO(trimmed);
  return isValid(parsed) ? parsed : null;
}

export function FloatingLabelDatePicker({
  label,
  value = null,
  onChange,
  displayFormat = "MMM d, yyyy",
  disabled = false,
  showClearButton = true,
  clearLabel = "Clear date",
  align = "start",
  className,
  containerClassName,
  contentClassName,
  dealDates,
}: FloatingLabelDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseFormDate(value);

  return (
    <FloatingLabelField
      label={label}
      hasValue={Boolean(selected)}
      active={open}
      disabled={disabled}
      containerClassName={containerClassName}
      className={cn("px-0", className)}
    >
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={label}
            className="flex h-12 w-full cursor-pointer items-center px-4 text-left text-sm font-light leading-none text-neutral-900 outline-none focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed"
          >
            <span className="min-w-0 flex-1 truncate">
              {selected ? format(selected, displayFormat) : ""}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className={cn(
            "w-auto rounded-3xl border-0 p-0 shadow-[0_14px_32px_rgba(0,0,0,0.18)]",
            contentClassName,
          )}
        >
          <MiniCalendar
            dealDates={dealDates}
            showClearButton={showClearButton}
            clearLabel={clearLabel}
            selected={selected ?? undefined}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </FloatingLabelField>
  );
}
