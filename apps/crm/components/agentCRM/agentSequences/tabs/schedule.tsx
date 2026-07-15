"use client";

import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { Input } from "@/components/ui/borderless-input";
import { SequenceSwitch } from "@/components/agentCRM/agentSequences/ui/sequence-switch";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ScheduleProps {
  sequenceId: string;
  formData: any;
  handleSelectChange: (field: string) => (value: string | boolean | number | null) => void;
}

interface ScheduleData {
  id: string;
  name: string;
  timezone: string | null;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  start_time: string;
  end_time: string;
  slug: string;
}

export default function Schedule({ sequenceId, formData, handleSelectChange }: ScheduleProps) {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!sequenceId) {
        return;
      }

      try {
        setLoading(true);
        // First get the schedule_id from the sequence
        const { data: sequenceData, error: sequenceError } = await supabase
          .from('sequences')
          .select('schedule_id')
          .eq('id', sequenceId)
          .single();

        if (sequenceError) {
          console.error("Error fetching sequence schedule_id:", sequenceError);
          setLoading(false);
          return;
        }

        if (!sequenceData?.schedule_id) {
          setLoading(false);
          return;
        }

        // Then fetch the schedule
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('sequence_schedules')
          .select('*')
          .eq('id', sequenceData.schedule_id)
          .single();

        if (scheduleError) {
          console.error("Error fetching schedule:", scheduleError);
          setSchedule(null);
        } else {
          setSchedule(scheduleData);
        }
      } catch (error) {
        console.error("Error fetching schedule:", error);
        setSchedule(null);
      } finally {
        setLoading(false);
      }
    };

    if (sequenceId) {
      fetchSchedule();
    }
  }, [sequenceId]);

  const formatTime = (timeString: string) => {
    if (!timeString) return "—";
    try {
      // Handle both "HH:MM:SS" and "HH:MM" formats
      const parts = timeString.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1] || '00';
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    } catch {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center justify-center py-8">
          <p className="text-sm font-light text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">SCHEDULE</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="text-center py-8">
          <p className="text-sm font-light text-muted-foreground">No schedule found for this sequence.</p>
        </div>
      </div>
    );
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  const fieldRowClass = "border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2 w-full";
  const fieldLabelClass = "w-32 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
  const inputClass = "border-0 bg-transparent px-0 text-[15px] font-light text-neutral-900 placeholder:text-neutral-300 focus-visible:ring-0 focus:ring-0 flex-1";

  return (
    <div className="space-y-6">
      {/* Schedule Information Container */}
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">SCHEDULE INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="min-h-[48px] flex items-center">
              <div className={fieldRowClass}>
                <div className="flex items-center">
                  <span className={fieldLabelClass}>Name</span>
                  <Input
                    placeholder="Schedule Name"
                    value={schedule.name || ""}
                    readOnly
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="min-h-[48px] flex items-center">
              <div className={fieldRowClass}>
                <div className="flex items-center">
                  <span className={fieldLabelClass}>Timezone</span>
                  <Input
                    placeholder="Timezone"
                    value={schedule.timezone || "Recipient Timezone"}
                    readOnly
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="min-h-[48px] flex items-center">
              <div className={fieldRowClass}>
                <div className="flex items-center">
                  <span className={fieldLabelClass}>Start time</span>
                  <Input
                    placeholder="Start Time"
                    value={formatTime(schedule.start_time)}
                    readOnly
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="min-h-[48px] flex items-center">
              <div className={fieldRowClass}>
                <div className="flex items-center">
                  <span className={fieldLabelClass}>End time</span>
                  <Input
                    placeholder="End Time"
                    value={formatTime(schedule.end_time)}
                    readOnly
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="min-h-[48px] flex items-center">
              <div className={fieldRowClass}>
                <div className="flex items-center">
                  <span className={fieldLabelClass}>Slug</span>
                  <Input
                    placeholder="Slug"
                    value={schedule.slug || ""}
                    readOnly
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Days of Week Container */}
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">DAYS OF WEEK</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {days.map((day) => (
            <div key={day.key} className="min-h-[48px] flex items-center">
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>{day.label}</span>
                  <SequenceSwitch
                    checked={schedule[day.key as keyof ScheduleData] as boolean}
                    disabled
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

