"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DealTypeEnum = string;

/** Format deal_type enum value for display. */
export function formatDealTypeLabel(value: string): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DealsTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function DealsTypeSelect({ value, onValueChange, className }: DealsTypeSelectProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc("get_deal_types");

        if (error) {
          console.warn("Failed to fetch deal types:", error.message);
          setOptions([]);
          return;
        }

        if (Array.isArray(data)) {
          setOptions(data.map((row: { value: string }) => row.value));
        } else {
          setOptions([]);
        }
      } catch (e) {
        console.warn("Error fetching deal types:", e);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, []);

  const handleValueChange = (selectedValue: string) => {
    onValueChange(selectedValue === "none" ? "" : selectedValue);
  };

  const valueTrimmed = (value ?? "").trim();
  const optionsWithCurrent =
    valueTrimmed && !options.includes(valueTrimmed) ? [valueTrimmed, ...options] : options;

  return (
    <Select value={valueTrimmed || undefined} onValueChange={handleValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading…" : "Select pipeline"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-muted-foreground">
          — None —
        </SelectItem>
        {optionsWithCurrent.map((option) => (
          <SelectItem
            key={option}
            value={option}
          >
            {formatDealTypeLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
