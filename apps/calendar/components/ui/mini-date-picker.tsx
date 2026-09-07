"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/mini-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type MiniDatePickerProps = {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  displayFormat?: string;
  disabled?: boolean;
  showClearButton?: boolean;
  clearLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  placeholderClassName?: string;
  contentClassName?: string;
  closeOnSelect?: boolean;
};

/** Walls-style compact date field with a mini-calendar popover. */
export function MiniDatePicker({
  value = null,
  onChange,
  label,
  placeholder = "Select date",
  displayFormat = "MMM d, yyyy",
  disabled = false,
  showClearButton = false,
  clearLabel = "Set null",
  open,
  onOpenChange,
  modal = false,
  align = "start",
  className,
  labelClassName,
  valueClassName,
  placeholderClassName,
  contentClassName,
  closeOnSelect = true,
}: MiniDatePickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const hasValue = value instanceof Date && !Number.isNaN(value.getTime());

  return (
    <Popover modal={modal} open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full cursor-pointer items-center gap-2 rounded-full px-4 text-left hover:bg-gray-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {label ? (
            <span className={cn("shrink-0", labelClassName)}>{label}</span>
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              valueClassName,
              !hasValue && placeholderClassName
            )}
          >
            {hasValue ? format(value, displayFormat) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto rounded-3xl border-0 p-0 shadow-[0_14px_32px_rgba(0,0,0,0.18)]",
          contentClassName
        )}
        align={align}
      >
        <MiniCalendar
          showClearButton={showClearButton}
          clearLabel={clearLabel}
          selected={hasValue ? value ?? undefined : undefined}
          onSelect={(date) => {
            onChange(date ?? null);
            if (closeOnSelect) setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
