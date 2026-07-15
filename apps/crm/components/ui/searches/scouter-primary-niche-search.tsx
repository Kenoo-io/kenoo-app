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

interface PrimaryNicheSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface PrimaryNiche {
  id: string;
  name: string;
}

export function PrimaryNicheSelect({ value, onValueChange, className }: PrimaryNicheSelectProps) {
  const [niches, setNiches] = useState<PrimaryNiche[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNiches = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("profile_categories")
          .select("id, name")
          .order("name", { ascending: true });

        if (error) throw error;

        setNiches(data || []);
      } catch (error) {
        console.error("Error fetching primary niches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNiches();
  }, []);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading niches..." : "Select a primary niche"} />
      </SelectTrigger>
      <SelectContent>
        {niches.map((niche) => (
          <SelectItem
            key={niche.id}
            value={niche.id}
          >
            {niche.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}