"use client";

import * as React from "react";
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from '@supabase/supabase-js';
import Image from "next/image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Talent {
  id: string;
  name: string;
  avatar_url: string;
}

interface TalentSelectorProps {
  selectedTalentIds: string[];
  onTalentChange: (talentIds: string[]) => void;
  className?: string;
}

export function TalentSelector({ selectedTalentIds, onTalentChange, className }: TalentSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [talent, setTalent] = React.useState<Talent[]>([]);
  const [selectedTalent, setSelectedTalent] = React.useState<Talent[]>([]);

  React.useEffect(() => {
    const fetchTalent = async () => {
      try {
        // Fetch active talent from Supabase
        const { data: talentData, error } = await supabase
          .from('talent')
          .select('id, first_name, last_name, avatar_url')
          .eq('status', 'Active')
          .order('first_name', { ascending: true });
        
        if (error) {
          console.error("Error fetching talent:", error);
          setTalent([]);
          return;
        }
        
        // Map talent data to Talent interface
        const talentList = (talentData || [])
          .map(t => {
            const firstName = t.first_name || '';
            const lastName = t.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            
            return {
              id: t.id,
              name: fullName,
              avatar_url: t.avatar_url || ''
            };
          })
          .filter(t => t.name) // Only include talent with a name
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        
        setTalent(talentList);
      } catch (error) {
        console.error("Error fetching talent:", error);
        setTalent([]);
      }
    };

    fetchTalent();
  }, []);

  // Update selected talent when selectedTalentIds changes
  React.useEffect(() => {
    const selected = talent.filter(t => selectedTalentIds.includes(t.id));
    setSelectedTalent(selected);
  }, [selectedTalentIds, talent]);

  const handleTalentSelect = (talentId: string) => {
    if (selectedTalentIds.includes(talentId)) {
      // Remove talent
      onTalentChange(selectedTalentIds.filter(id => id !== talentId));
    } else {
      // Add talent
      onTalentChange([...selectedTalentIds, talentId]);
    }
  };

  const handleRemoveTalent = (talentId: string) => {
    onTalentChange(selectedTalentIds.filter(id => id !== talentId));
  };

  const availableTalent = talent.filter(t => !selectedTalentIds.includes(t.id));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected Talent List */}
      {selectedTalent.length > 0 && (
        <div className="space-y-2">
          {selectedTalent.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg bg-white/50 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {t.avatar_url && (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={t.avatar_url}
                      alt={t.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = FALLBACK_ICON_URL;
                      }}
                    />
                  </div>
                )}
                <span className="text-sm font-light">{t.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveTalent(t.id)}
                className="h-6 w-6 p-0 text-neutral-500 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Talent Button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between bg-transparent text-foreground border border-neutral-200 hover:bg-gray-50"
          >
            <span className="font-normal">Add Talent...</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command className="w-full">
            <CommandInput placeholder="Search talent..." />
            <CommandList>
              <CommandEmpty className="font-normal">No talent found.</CommandEmpty>
              <CommandGroup>
                {availableTalent.map((t) => (
                  <CommandItem
                    key={t.id}
                    onSelect={() => {
                      handleTalentSelect(t.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {t.avatar_url && (
                        <div className="relative w-6 h-6 rounded-full overflow-hidden">
                          <Image
                            src={t.avatar_url}
                            alt={t.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = FALLBACK_ICON_URL;
                            }}
                          />
                        </div>
                      )}
                      <span className="font-normal">{t.name}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedTalentIds.includes(t.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

