"use client";

import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import {
  FloatingLabelField,
  FloatingLabelValue,
} from "@/components/ui/floating-label-input";
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
            <FloatingLabelValue label="Name" value={schedule.name || ""} />
            <FloatingLabelValue
              label="Timezone"
              value={schedule.timezone || "Recipient Timezone"}
            />
            <FloatingLabelValue label="Start time" value={formatTime(schedule.start_time)} />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FloatingLabelValue label="End time" value={formatTime(schedule.end_time)} />
            <FloatingLabelValue label="Slug" value={schedule.slug || ""} />
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
            <FloatingLabelField key={day.key} label={day.label} hasValue>
              <div className="flex h-12 items-center">
                <SequenceSwitch
                  checked={schedule[day.key as keyof ScheduleData] as boolean}
                  disabled
                />
              </div>
            </FloatingLabelField>
          ))}
        </div>
      </div>
    </div>
  );
}

