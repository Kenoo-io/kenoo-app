"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, UsersRound } from "lucide-react";
import { GoogleMeetInvite, InviteResponse } from "@/lib/google-meet-invite";

interface Props { invite: GoogleMeetInvite; }

function formatInviteTime(invite: GoogleMeetInvite) {
  const start = new Date(invite.start);
  const end = new Date(invite.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const date = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(start);
  const endTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(end);
  return `${date} · ${time} – ${endTime}`;
}

export function GoogleMeetInviteBanner({ invite }: Props) {
  const [visible, setVisible] = useState(false);
  const [response, setResponse] = useState<InviteResponse | null>(null);
  const [saving, setSaving] = useState<InviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const time = formatInviteTime(invite);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar/invite-status")
      .then((result) => result.ok ? result.json() : { connected: false })
      .then((data: { connected?: boolean }) => { if (!cancelled) setVisible(Boolean(data.connected)); })
      .catch(() => { if (!cancelled) setVisible(false); });
    return () => { cancelled = true; };
  }, []);

  const respond = async (next: InviteResponse) => {
    setSaving(next);
    setError(null);
    try {
      const result = await fetch("/api/calendar/respond-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...invite, response: next }),
      });
      if (!result.ok) {
        const data = await result.json().catch(() => null) as { error?: string; details?: string } | null;
        throw new Error(data?.details || data?.error || "Unable to save invitation");
      }
      setResponse(next);
    } catch (respondError) {
      setError(respondError instanceof Error ? respondError.message : "Unable to save invitation");
    }
    finally { setSaving(null); }
  };

  if (!visible || !time) return null;

  return (
    <div className="mb-5 rounded-[22px] bg-[#eef3fb] px-6 py-5 text-[#202124]">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
        <div className="min-w-[300px] flex-1">
          <p className="text-[14px] font-bold leading-5 tracking-[-0.01em]">{time}</p>
          <p className="mt-1 truncate text-[21px] font-normal leading-7 tracking-[-0.025em]">{invite.summary}</p>
          <div className="mt-4 flex items-center gap-2 text-[13px] text-[#5f6368]">
            <UsersRound className="h-4 w-4 stroke-[1.8] text-[#4b4f53]" />
            <span>
              {invite.organizer || invite.organizerName ? (
                <>{invite.organizer || invite.organizerName} <span className="text-[#70757a]">- Organizer</span></>
              ) : "Google Calendar invitation"}
            </span>
          </div>
        </div>
        <div className="flex min-w-[280px] flex-1 items-start gap-3 pt-1 text-[14px] text-[#5f6368]">
          <Image
            src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png"
            alt="Google Calendar"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0"
          />
          <div>
            <p className="font-bold text-[#45484c]">On your Google Calendar</p>
            <p className="mt-1 leading-5">RSVP to this event in Google Calendar.</p>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 pt-0">
          {([["accepted", "Yes"], ["declined", "No"], ["tentative", "Maybe"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={saving !== null}
              onClick={() => void respond(value)}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-[15px] font-bold transition-colors disabled:opacity-60 ${response === value ? "bg-[#0b74b5] text-white" : "bg-[#0b74b5] text-white hover:bg-[#08669f]"}`}
            >
              {saving === value && <Loader2 className="h-4 w-4 animate-spin" />}
              {response === value ? "Saved" : label}
            </button>
          ))}
        </div>
        {error && <p className="w-full text-xs text-[#b3261e]">{error}</p>}
      </div>
    </div>
  );
}
