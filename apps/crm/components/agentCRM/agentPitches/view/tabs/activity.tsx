"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { Mail, Linkedin, Instagram, Globe, MessageSquare, RefreshCw } from "lucide-react";

interface PitchActivity {
  id: string;
  created_at: string;
  activity_type: string;
  activity_source: string;
  channel: string | null;
}

interface ActivityTabProps {
  pitchId: string;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Globe className="w-4 h-4" />,
  walls: <Globe className="w-4 h-4" />,
  tiktok: <Globe className="w-4 h-4" />,
  other: <MessageSquare className="w-4 h-4" />,
};

const SOURCE_COLORS: Record<string, string> = {
  sequence: 'bg-blue-100 text-blue-700',
  manual: 'bg-green-100 text-green-700',
  inbound: 'bg-purple-100 text-purple-700',
  system: 'bg-neutral-100 text-neutral-600',
  api: 'bg-orange-100 text-orange-700',
};

export default function ActivityTab({ pitchId }: ActivityTabProps) {
  const [activities, setActivities] = useState<PitchActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('pitches_activities')
          .select('id, created_at, activity_type, activity_source, channel')
          .eq('pitch_id', pitchId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setActivities(data);
        }
      } catch (err) {
        console.error("Error fetching pitch activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [pitchId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/50 backdrop-blur-sm shadow-sm rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">ACTIVITY</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground font-light text-center py-8">
            No activity recorded for this pitch yet.
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-2xl bg-neutral-100 shadow-inner border border-neutral-200/50"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
                  {activity.channel ? (CHANNEL_ICONS[activity.channel] ?? <Globe className="w-4 h-4" />) : <MessageSquare className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground capitalize">
                      {activity.activity_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SOURCE_COLORS[activity.activity_source] ?? 'bg-neutral-100 text-neutral-600'}`}>
                      {activity.activity_source}
                    </span>
                    {activity.channel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-600 capitalize">
                        {activity.channel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-light mt-1">
                    {formatDate(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
