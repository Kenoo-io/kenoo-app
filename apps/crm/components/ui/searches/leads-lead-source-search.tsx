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

interface LeadSourceSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface LeadSource {
  id: string;
  name: string;
}

export function LeadSourceSelect({
  value,
  onValueChange,
  className,
}: LeadSourceSelectProps) {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("people")
          .select("source")
          .not("source", "is", null);

        if (error) {
          console.error("Error fetching lead sources:", error);
          setSources([]);
          return;
        }

        const unique = Array.from(
          new Set(
            (data || [])
              .map((row: { source: string | null }) => row.source)
              .filter((s): s is string => Boolean(s?.trim())),
          ),
        ).sort((a, b) => a.localeCompare(b));

        setSources(unique.map((name) => ({ id: name, name })));
      } catch (error) {
        console.error("Error fetching lead sources:", error);
        setSources([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={loading}>
      <SelectTrigger className={className}>
        <SelectValue
          placeholder={loading ? "Loading sources..." : "Select a lead source"}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-muted-foreground">
          -- None --
        </SelectItem>
        {sources.map((source) => (
          <SelectItem key={source.id} value={source.name}>
            {source.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
