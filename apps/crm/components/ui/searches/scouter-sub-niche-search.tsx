"use client";

import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import {
  TagSelect,
  TagSelectContent,
  TagSelectItem,
  TagSelectTrigger,
  TagSelectValue,
} from "@/components/ui/tag-select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface SubNicheSelectProps {
  selectedNiches: string[];
  primaryNiche: string;
  onAddNiche: (niche: string) => void;
  onRemoveNiche: (index: number) => void;
  className?: string;
}

interface Niche {
  id: string;
  name: string;
}

export function SubNicheSelect({ 
  selectedNiches, 
  primaryNiche, 
  onAddNiche, 
  onRemoveNiche, 
  className 
}: SubNicheSelectProps) {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchNiches = async () => {
      try {
        const db = getFirestore();
        const nichesCollection = collection(db, "typesScouterPrimaryNiche");
        const snapshot = await getDocs(nichesCollection);
        
        const nichesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || "",
        }));
        
        // Sort niches alphabetically by name
        nichesData.sort((a, b) => a.name.localeCompare(b.name));
        
        setNiches(nichesData);
      } catch (error) {
        console.error("Error fetching niches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNiches();
  }, []);

  // Filter out niches that are already selected or match the primary niche
  const availableNiches = niches.filter(niche => 
    !selectedNiches.includes(niche.name) && 
    niche.name !== primaryNiche
  );

  return (
    <div className="space-y-2">
      <TagSelect
        open={open}
        onOpenChange={setOpen}
        value=""
        onValueChange={(value) => {
          if (!selectedNiches.includes(value) && value !== primaryNiche) {
            onAddNiche(value);
          }
        }}
        disabled={loading}
      >
        <TagSelectTrigger className={`${className} flex flex-wrap gap-1 min-h-[40px] h-auto [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground [&>.chevron-down]:hidden`}>
          {selectedNiches.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedNiches.map((niche, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="group relative"
                >
                  {niche}
                  <div
                    role="button"
                    tabIndex={0}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemoveNiche(index);
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveNiche(index);
                      }
                    }}
                    className="ml-1 hover:text-destructive cursor-pointer relative z-50"
                  >
                    <X className="h-3 w-3" />
                  </div>
                </Badge>
              ))}
            </div>
          ) : (
            <TagSelectValue placeholder={loading ? "Loading niches..." : "Add sub niches"} />
          )}
        </TagSelectTrigger>
        <TagSelectContent className="rounded-[25px]">
          {availableNiches.map((niche) => (
            <TagSelectItem 
              key={niche.id} 
              value={niche.name}
              className="rounded-[20px]"
            >
              {niche.name}
            </TagSelectItem>
          ))}
        </TagSelectContent>
      </TagSelect>
    </div>
  );
} 