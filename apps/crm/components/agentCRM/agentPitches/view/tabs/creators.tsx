"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import React, { useState } from "react";
import { X } from "lucide-react";
import { CreatorSearch } from "@/components/ui/creator-search";
import { getSupabaseClient } from "@/app/auth/supabaseClient";

interface Creator {
  pitch_id: string;
  talent_id: string;
  talent: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    walls_email: string | null;
    profile_id: string | null;
  };
}

interface CreatorsTabProps {
  pitchId: string;
  creators: Creator[];
  onCreatorsChange: (creators: Creator[]) => void;
}

export default function CreatorsTab({ pitchId, creators, onCreatorsChange }: CreatorsTabProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const getCreatorDisplayName = (creator: Creator) => {
    const t = creator.talent;
    if (t.first_name && t.last_name) return `${t.first_name} ${t.last_name}`;
    return t.walls_email || 'Unknown';
  };

  const handleAddCreator = async (_name: string, talentId?: string) => {
    if (!talentId) return;
    setIsAdding(true);
    try {
      const supabase = getSupabaseClient();

      if (creators.some(c => c.talent_id === talentId)) {
        wallsToast.success("Already added", "This creator is already on the pitch");
        return;
      }

      const { error } = await supabase
        .from('pitches_creators')
        .insert({ pitch_id: pitchId, talent_id: talentId });

      if (error) throw error;

      // Fetch the newly added creator details
      const { data: newCreator } = await supabase
        .from('pitches_creators')
        .select(`pitch_id, talent_id, talent!inner (id, first_name, last_name, walls_email, profile_id)`)
        .eq('pitch_id', pitchId)
        .eq('talent_id', talentId)
        .single();

      if (newCreator) {
        onCreatorsChange([...creators, newCreator as any]);
      }

      setSearchValue("");
      wallsToast.success("Creator added");
    } catch (err) {
      console.error(err);
      wallsToast.error("Error", "Failed to add creator");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCreator = async (talentId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('pitches_creators')
        .delete()
        .eq('pitch_id', pitchId)
        .eq('talent_id', talentId);

      if (error) throw error;

      onCreatorsChange(creators.filter(c => c.talent_id !== talentId));
      wallsToast.negative("Creator removed");
    } catch (err) {
      console.error(err);
      wallsToast.error("Error", "Failed to remove creator");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">CREATORS</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>

        {/* Add Creator */}
        <div className="mb-6">
          <label className="text-xs font-normal text-neutral-400 tracking-wide block mb-2">Add Creator</label>
          <CreatorSearch
            value={searchValue}
            onChange={setSearchValue}
            onChangeWithId={handleAddCreator}
            selectedIds={creators.map((c) => c.talent_id)}
            onRemoveId={handleRemoveCreator}
            triggerIcon="chevron"
          />
        </div>

        {/* Creator List */}
        {creators.length === 0 ? (
          <p className="text-sm text-muted-foreground font-light text-center py-8">
            No creators on this pitch yet.
          </p>
        ) : (
          <div className="space-y-3">
            {creators.map((creator) => (
              <div
                key={creator.talent_id}
                className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100 shadow-inner border border-neutral-200/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-neutral-600">
                      {getCreatorDisplayName(creator).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {getCreatorDisplayName(creator)}
                    </p>
                    {creator.talent.walls_email && (
                      <p className="text-xs text-muted-foreground font-light">
                        {creator.talent.walls_email}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveCreator(creator.talent_id)}
                  className="p-2 rounded-full hover:bg-neutral-200 transition-colors text-neutral-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
