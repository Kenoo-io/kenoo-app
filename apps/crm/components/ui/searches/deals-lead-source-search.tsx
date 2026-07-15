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

/** Format deal_source enum value for display (e.g. "inbound-agency-email" → "Inbound agency email") */
export function formatDealSourceLabel(value: string): string {
  if (!value) return "—";
  return value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DealsLeadSourceSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function DealsLeadSourceSelect({ value, onValueChange, className }: DealsLeadSourceSelectProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnumValues = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc("get_deal_sources");

        if (error) {
          console.warn("Failed to fetch deal sources:", error.message);
          setOptions([]);
          return;
        }

        if (Array.isArray(data)) {
          setOptions(data.map((row: { value: string }) => row.value));
        } else {
          setOptions([]);
        }
      } catch (e) {
        console.warn("Error fetching deal sources:", e);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEnumValues();
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
        <SelectValue placeholder={loading ? "Loading…" : "Select deal source"} />
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
            {formatDealSourceLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
