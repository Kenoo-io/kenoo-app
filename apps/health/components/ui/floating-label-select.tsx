"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
import { kenooColors } from "@walls/ui/colors";
import { cn } from "@walls/utils";

export type FloatingLabelSelectOption = {
  value: string;
  label: string;
};

export type FloatingLabelSelectProps = {
  label: string;
  options: FloatingLabelSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  containerClassName?: string;
};

const NEUTRAL_200 = "#e5e5e5";
const NEUTRAL_400 = "#a3a3a3";
const NEUTRAL_500 = "#737373";
const KENOO_SKY = kenooColors.sky.DEFAULT;

const POSITION_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.6,
};

const COLOR_TRANSITION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function FloatingLabelSelect({
  label,
  options,
  value = "",
  onChange,
  disabled,
  id,
  className,
  containerClassName,
}: FloatingLabelSelectProps) {
  const [open, setOpen] = React.useState(false);
  const generatedId = React.useId();
  const selectId = id ?? generatedId;

  const selected = options.find((option) => option.value === value);
  const hasValue = Boolean(selected);
  const floated = open || hasValue;

  const accentColor = open
    ? KENOO_SKY
    : floated
      ? NEUTRAL_500
      : NEUTRAL_400;

  return (
    <div className={cn("pt-2", containerClassName)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <motion.button
            type="button"
            id={selectId}
            disabled={disabled}
            aria-label={label}
            className={cn(
              "relative flex h-12 w-full cursor-pointer items-center rounded-2xl border bg-kenoo-white px-4 pr-10 text-left text-sm font-light leading-none text-foreground outline-none focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            initial={false}
            animate={{
              borderColor: open ? KENOO_SKY : NEUTRAL_200,
            }}
            transition={COLOR_TRANSITION}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                !hasValue && "text-transparent",
              )}
            >
              {selected?.label ?? label}
            </span>
            <ChevronDown
              className={cn(
                "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
            <motion.span
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-3 flex origin-left items-center px-1.5 font-light",
                floated ? "bg-kenoo-white" : "bg-transparent",
                disabled && "opacity-50",
              )}
              initial={false}
              animate={{
                top: floated ? 0 : "50%",
                y: "-50%",
                scale: floated ? 0.78 : 1,
                color: accentColor,
              }}
              transition={{
                top: POSITION_TRANSITION,
                y: POSITION_TRANSITION,
                scale: POSITION_TRANSITION,
                color: COLOR_TRANSITION,
              }}
            >
              <span className="text-sm leading-none">{label}</span>
            </motion.span>
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] rounded-2xl border-0 bg-kenoo-white p-2 shadow-xl"
        >
          <div className="space-y-0.5">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => onChange(option.value)}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-2.5",
                    active
                      ? "bg-neutral-100 focus:bg-neutral-100"
                      : "hover:bg-neutral-100/80 focus:bg-neutral-100/80",
                  )}
                >
                  <div className="flex w-full items-center gap-3">
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-sm text-foreground",
                        active ? "font-medium" : "font-light",
                      )}
                    >
                      {option.label}
                    </span>
                    {active ? (
                      <Check
                        className="h-4 w-4 shrink-0 text-[var(--kenoo-sky)]"
                        strokeWidth={2.75}
                      />
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
