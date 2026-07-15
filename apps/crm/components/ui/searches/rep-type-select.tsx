"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RepTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const repTypes = [
  { value: "exclusive", label: "Exclusive" },
  { value: "non-exclusive", label: "Non-exclusive" },
  { value: "released", label: "Released" },
];

export function RepTypeSelect({ value, onValueChange, className }: RepTypeSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = value
    ? repTypes.find((type) => type.value === value)?.label
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between border-0 bg-transparent shadow-none",
            "rounded-[25px] px-4 py-2 hover:bg-gray-100",
            "text-[15px] font-light text-neutral-900",
            className
          )}
        >
          <span className={cn("truncate", selectedLabel ? "text-neutral-900" : "text-neutral-300")}>
            {selectedLabel ?? "Select rep type..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-neutral-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 rounded-[25px] overflow-hidden border border-neutral-200/60 shadow-xl bg-white/90 backdrop-blur-xl"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandList>
            <CommandGroup>
              {repTypes.map((type) => {
                const isSelected = value === type.value;
                return (
                  <CommandItem
                    key={type.value}
                    value={type.value}
                    onSelect={() => {
                      onValueChange(isSelected ? "" : type.value);
                      setOpen(false);
                    }}
                    className="rounded-[20px] mx-2 my-1"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {type.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
