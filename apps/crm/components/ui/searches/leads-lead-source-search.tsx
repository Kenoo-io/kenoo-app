"use client";

import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

export function LeadSourceSelect({ value, onValueChange, className }: LeadSourceSelectProps) {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const db = getFirestore();
        const sourcesCollection = collection(db, "typesLeadsLeadSource");
        const snapshot = await getDocs(sourcesCollection);
        
        const sourcesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || "",
        }));
        
        // Sort sources alphabetically by name
        sourcesData.sort((a, b) => a.name.localeCompare(b.name));
        
        setSources(sourcesData);
      } catch (error) {
        console.error("Error fetching lead sources:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading sources..." : "Select a lead source"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-muted-foreground">
          -- None --
        </SelectItem>
        {sources.map((source) => (
          <SelectItem 
            key={source.id} 
            value={source.name}
          >
            {source.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 