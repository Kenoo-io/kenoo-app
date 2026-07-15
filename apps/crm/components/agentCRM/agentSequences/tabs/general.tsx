"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState, useEffect } from "react";
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";
import { createClient } from '@supabase/supabase-js';
import { Input } from "@/components/ui/borderless-input";
import { format } from "date-fns";
import { SequenceSwitch } from "@/components/agentCRM/agentSequences/ui/sequence-switch";
import { TalentSelector } from "./talent-selector";
import { SequenceOwnerSelect } from "@/components/agentCRM/ui/sequence-owner-select";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GeneralProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: string) => (value: string | boolean | number | null) => void;
  sequenceId?: string | null;
  initialData?: any;
  sequenceOwnerId?: string | null;
}

export default function General({
  formData,
  handleInputChange,
  handleSelectChange,
  sequenceId,
  initialData,
  sequenceOwnerId,
}: GeneralProps) {
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>([]);
  const [loadingTalent, setLoadingTalent] = useState(false);
  const [ownerData, setOwnerData] = useState<{ first_name: string | null; last_name: string | null; avatar_url: string | null } | null>(null);

  // Fetch owner data for create mode display
  useEffect(() => {
    const fetchOwnerData = async () => {
      if (!sequenceOwnerId || initialData) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('first_name, last_name, avatar_url')
          .eq('id', sequenceOwnerId)
          .single();

        if (error) {
          console.error("Error fetching owner data:", error);
          return;
        }

        if (data) {
          setOwnerData({
            first_name: data.first_name,
            last_name: data.last_name,
            avatar_url: data.avatar_url || null,
          });
        }
      } catch (error) {
        console.error("Error fetching owner data:", error);
      }
    };

    fetchOwnerData();
  }, [sequenceOwnerId, initialData]);

  // Fetch existing talent for this sequence
  useEffect(() => {
    const fetchSequenceTalent = async () => {
      if (!sequenceId) {
        setSelectedTalentIds([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sequence_talent')
          .select('talent_id')
          .eq('sequence_id', sequenceId);

        if (error) {
          console.error("Error fetching sequence talent:", error);
          return;
        }

        if (data) {
          const talentIds = data.map(item => item.talent_id).filter(Boolean);
          setSelectedTalentIds(talentIds);
        }
      } catch (error) {
        console.error("Error fetching sequence talent:", error);
      }
    };

    fetchSequenceTalent();
  }, [sequenceId]);

  // Handle talent changes - save to database
  const handleTalentChange = async (talentIds: string[]) => {
    if (!sequenceId) {
      wallsToast.success("Save sequence first", "Create the sequence before tagging talent.");
      return;
    }

    setLoadingTalent(true);
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('sequence_talent')
        .select('talent_id')
        .eq('sequence_id', sequenceId);

      if (fetchError) throw fetchError;

      const currentTalentIds = (currentData || []).map(item => item.talent_id);
      const toAdd = talentIds.filter(id => !currentTalentIds.includes(id));
      const toRemove = currentTalentIds.filter(id => !talentIds.includes(id));

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('sequence_talent')
          .delete()
          .eq('sequence_id', sequenceId)
          .in('talent_id', toRemove);
        if (deleteError) throw deleteError;
      }

      if (toAdd.length > 0) {
        const insertData = toAdd.map(talentId => ({
          sequence_id: sequenceId,
          talent_id: talentId,
        }));
        const { error: insertError } = await supabase
          .from('sequence_talent')
          .insert(insertData);
        if (insertError) throw insertError;
      }

      setSelectedTalentIds(talentIds);

      wallsToast.success("Success", "Talent updated successfully");
    } catch (error) {
      console.error("Error updating sequence talent:", error);
      wallsToast.error("Error", "Failed to update talent");
    } finally {
      setLoadingTalent(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "—";
    if (timestamp instanceof Date) return format(timestamp, "MMM d, yyyy");
    if (typeof timestamp === 'string') {
      try {
        return format(new Date(timestamp), "MMM d, yyyy");
      } catch {
        return timestamp || "—";
      }
    }
    return timestamp || "—";
  };

  const getOwnerName = () => {
    if (ownerData) {
      const name = `${ownerData.first_name || ''} ${ownerData.last_name || ''}`.trim();
      return name || 'Unknown User';
    }
    return '—';
  };

  const fieldRowClass = "border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2 w-full";
  const fieldLabelClass = "w-32 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
  const inputClass = "border-0 bg-transparent px-0 text-[15px] font-light text-neutral-900 placeholder:text-neutral-300 focus-visible:ring-0 focus:ring-0 flex-1";

  return (
    <div className="space-y-6">
      {/* Sequence Information Container */}
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">SEQUENCE INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Name - left */}
          <div className="min-h-[48px] flex items-center">
            <div className={fieldRowClass}>
              <div className="flex items-center">
                <span className={fieldLabelClass}>Name</span>
                <Input
                  placeholder="Sequence Name"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Stop on reply - right */}
          <div className="min-h-[48px] flex items-center">
            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Stop on reply</span>
                <SequenceSwitch
                  checked={formData.stop_on_reply}
                  onCheckedChange={(checked) => handleSelectChange("stop_on_reply")(checked)}
                />
              </div>
            </div>
          </div>

          {/* Use case - left */}
          <div className="min-h-[48px] flex items-center">
            <div className={fieldRowClass}>
              <div className="flex items-center">
                <span className={fieldLabelClass}>Use case</span>
                <Select
                  value={formData.use_case || "general"}
                  onValueChange={(value) => handleSelectChange("use_case")(value)}
                >
                  <SelectTrigger className="border-0 bg-transparent shadow-none h-8 px-0 focus:ring-0 focus-visible:ring-0 flex-1 font-light text-neutral-900">
                    <SelectValue placeholder="General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      General
                    </SelectItem>
                    <SelectItem value="scouting">
                      Scouting
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Daily limit - right */}
          <div className="min-h-[48px] flex items-center">
            <div className={fieldRowClass}>
              <div className="flex items-center">
                <span className={fieldLabelClass}>Daily limit</span>
                <Input
                  type="number"
                  placeholder="Daily Limit"
                  value={formData.daily_limit || ""}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                    handleSelectChange("daily_limit")(value);
                  }}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Description - full width */}
          <div className="col-span-2 min-h-[48px] flex items-center">
            <div className={fieldRowClass}>
              <div className="flex items-center">
                <span className={fieldLabelClass}>Description</span>
                <Input
                  placeholder="Description"
                  value={formData.description || ""}
                  onChange={handleInputChange("description")}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Container - view mode only */}
      {initialData && (
        <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
          <div className="flex items-center mb-6">
            <h2 className="text-black font-black text-4xl">STATISTICS</h2>
            <div className="flex-1 border-t border-black h-[1px] mx-4" />
          </div>
          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              <div className="min-h-[48px] flex items-center">
                <div className={fieldRowClass}>
                  <div className="flex items-center gap-2">
                    <span className={fieldLabelClass}>Total contacts</span>
                    <span className="text-sm font-light">{initialData.contact_count || 0}</span>
                  </div>
                </div>
              </div>
              <div className="min-h-[48px] flex items-center">
                <div className={fieldRowClass}>
                  <div className="flex items-center gap-2">
                    <span className={fieldLabelClass}>Active</span>
                    <span className="text-sm font-light">{initialData.active_count || 0}</span>
                  </div>
                </div>
              </div>
              <div className="min-h-[48px] flex items-center">
                <div className={fieldRowClass}>
                  <div className="flex items-center gap-2">
                    <span className={fieldLabelClass}>Use case</span>
                    <span className="text-sm font-light">{initialData.use_case || "general"}</span>
                  </div>
                </div>
              </div>
              <div className="min-h-[48px] flex items-center">
                <div className={fieldRowClass}>
                  <div className="flex items-center gap-2">
                    <span className={fieldLabelClass}>Paused</span>
                    <span className="text-sm font-light">{initialData.paused_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="min-h-[48px] flex items-center">
                <div className={fieldRowClass}>
                  <div className="flex items-center gap-2">
                    <span className={fieldLabelClass}>Complete</span>
                    <span className="text-sm font-light">{initialData.complete_count || 0}</span>
                  </div>
                </div>
              </div>
              <div className="min-h-[48px] flex items-center">
                <div className={fieldRowClass}>
                  <div className="flex items-center gap-2">
                    <span className={fieldLabelClass}>Replied</span>
                    <span className="text-sm font-light">{initialData.replied_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Information Container */}
      {(initialData || sequenceId) && (
        <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
          <div className="flex items-center mb-6">
            <h2 className="text-black font-black text-4xl">SYSTEM INFORMATION</h2>
            <div className="flex-1 border-t border-black h-[1px] mx-4" />
          </div>
          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              <div className="min-h-[48px] flex items-center">
                <div className={fieldRowClass}>
                  <div className="flex items-center gap-2">
                    {initialData ? (
                      <>
                        <span className={fieldLabelClass}>Owner</span>
                        <div className="flex-1">
                          <SequenceOwnerSelect
                            value={formData.sequence_owner || ""}
                            onValueChange={(value) => handleSelectChange("sequence_owner")(value)}
                            className="border-0 bg-transparent w-full [&>*]:border-0 [&>*]:bg-transparent [&_*]:font-light [&_*]:text-neutral-900 focus:ring-0 h-8"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={fieldLabelClass}>Created by</span>
                        <div className="flex-1 flex items-center gap-2">
                          {sequenceOwnerId ? (
                            <>
                              {ownerData?.avatar_url ? (
                                <Image
                                  src={ownerData.avatar_url}
                                  alt={getOwnerName()}
                                  width={24}
                                  height={24}
                                  className="rounded-full object-cover border border-neutral-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = FALLBACK_ICON_URL;
                                  }}
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-neutral-200 border border-neutral-200 flex items-center justify-center">
                                  <span className="text-xs text-neutral-500">—</span>
                                </div>
                              )}
                              <span className="font-light text-[15px]">{getOwnerName()}</span>
                            </>
                          ) : (
                            <span className="font-light text-[15px]">—</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {initialData && (
                <div className="min-h-[48px] flex items-center">
                  <div className={fieldRowClass}>
                    <div className="flex items-center">
                      <span className={fieldLabelClass}>Created at</span>
                      <Input
                        placeholder="Created at"
                        value={formatTimestamp(formData.createdAt)}
                        readOnly
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {initialData && (
                <div className="min-h-[48px] flex items-center">
                  <div className={fieldRowClass}>
                    <div className="flex items-center">
                      <span className={fieldLabelClass}>Updated at</span>
                      <Input
                        placeholder="Updated at"
                        value={formatTimestamp(formData.updated_at)}
                        readOnly
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="min-h-[48px] flex items-center">
                <div className={fieldRowClass}>
                  <div className="flex items-center">
                    <span className={fieldLabelClass}>Sequence ID</span>
                    <Input
                      placeholder="Sequence ID"
                      value={sequenceId || "—"}
                      readOnly
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Talent Container */}
      {(formData.use_case || "general") !== "scouting" && (
        <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
          <div className="flex items-center mb-6">
            <h2 className="text-black font-black text-4xl">TALENT</h2>
            <div className="flex-1 border-t border-black h-[1px] mx-4" />
          </div>
          <div className="space-y-4">
            <div className="min-h-[48px] flex items-start">
              <div className="border-0 rounded-[24px] bg-transparent px-4 py-2 w-full">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500">Tracked talent</span>
                  <TalentSelector
                    selectedTalentIds={selectedTalentIds}
                    onTalentChange={handleTalentChange}
                    className="mt-2"
                  />
                  {!sequenceId && (
                    <p className="text-xs text-neutral-400 font-light">
                      Save the sequence first to tag talent.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
