"use client";

import * as React from "react";
import { Mail, Search, UserRound, Users } from "lucide-react";

import { cn } from "@walls/utils";

const panelGlassClass = "bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

type AudienceProfile = {
  id: string;
  source: string | null;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  first_seen_at: string;
  last_seen_at: string;
  event_count: number;
  last_event: { key: string; name: string; occurred_at: string } | null;
};

type AudienceResponse = {
  profiles?: AudienceProfile[];
  summary?: { totalProfiles: number; knownEmails: number; totalEvents: number; recentlyActive: number };
  error?: string;
};

const numberFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

export function AudiencePage() {
  const [profiles, setProfiles] = React.useState<AudienceProfile[]>([]);
  const [summary, setSummary] = React.useState<AudienceResponse["summary"]>(undefined);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadAudience = async () => {
      try {
        const response = await fetch("/api/audience");
        const payload = (await response.json().catch(() => ({}))) as AudienceResponse;
        if (!response.ok) throw new Error(payload.error ?? "Unable to load audience");
        setProfiles(payload.profiles ?? []);
        setSummary(payload.summary);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load audience");
      } finally {
        setLoading(false);
      }
    };
    void loadAudience();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleProfiles = profiles.filter((profile) => {
    if (!normalizedSearch) return true;
    return [getProfileName(profile), profile.email, profile.company, profile.job_title, profile.source, profile.last_event?.name, profile.last_event?.key]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch));
  });

  return (
    <div className="min-h-full bg-kenoo-white">
      <div className="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-8">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">People in your audience</p>
          <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Audience</h1>
          <p className="mt-2 max-w-xl text-[13px] font-light leading-6 text-[#858585]">Profiles created from identifiable events across your connected applications.</p>
        </header>

        {error ? <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total profiles" value={summary ? numberFormatter.format(summary.totalProfiles) : "—"} icon={Users} loading={loading} />
          <SummaryCard label="Known emails" value={summary ? numberFormatter.format(summary.knownEmails) : "—"} icon={Mail} loading={loading} />
          <SummaryCard label="Events captured" value={summary ? numberFormatter.format(summary.totalEvents) : "—"} icon={UserRound} loading={loading} />
          <SummaryCard label="Active this week" value={summary ? numberFormatter.format(summary.recentlyActive) : "—"} icon={Users} loading={loading} />
        </section>

        <section className={cn("mt-8 overflow-hidden rounded-[28px]", panelGlassClass)}>
          <div className="flex flex-col gap-4 border-b border-[#eeeeee] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">People</h2>
              <p className="mt-1 text-[12px] text-[#909090]">Everyone Workflows can use as a workflow audience</p>
            </div>
            <label className="relative block w-full sm:w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" strokeWidth={1.7} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="h-10 w-full rounded-xl border border-[#e5e5e5] bg-white/80 pl-9 pr-3 text-[12px] text-[#333] outline-none transition placeholder:text-[#aaa] focus:border-[#bbb] focus:ring-2 focus:ring-black/[0.04]" />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead><tr className="border-b border-[#f1f1f1] text-[10px] uppercase tracking-[0.1em] text-[#a0a0a0]"><th className="px-6 py-3 font-medium">Person</th><th className="px-4 py-3 font-medium">Source</th><th className="px-4 py-3 text-right font-medium">Events</th><th className="px-6 py-3 text-right font-medium">Last active</th></tr></thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, index) => <tr key={index} className="border-b border-[#f3f3f3]"><td colSpan={4} className="px-6 py-5"><div className="h-8 animate-pulse rounded bg-[#f5f5f5]" /></td></tr>) : visibleProfiles.length ? visibleProfiles.map((profile) => <ProfileRow key={profile.id} profile={profile} />) : <tr><td colSpan={4}><EmptyAudienceState searched={Boolean(normalizedSearch)} /></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileRow({ profile }: { profile: AudienceProfile }) {
  const name = getProfileName(profile);
  return <tr className="border-b border-[#f3f3f3] transition-colors last:border-0 hover:bg-white/70">
    <td className="px-6 py-4"><div className="min-w-0"><p className="truncate text-[13px] font-medium text-[#222]">{name}</p><p className="mt-0.5 truncate text-[11px] text-[#999]">{profile.email ?? profile.company ?? "No email available"}</p></div></td>
    <td className="px-4 py-4"><span className="inline-flex rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[10px] font-medium capitalize text-[#666]">{profile.source ?? "api"}</span></td>
    <td className="px-4 py-4 text-right"><p className="text-[12px] font-medium text-[#444]">{numberFormatter.format(profile.event_count)}</p><p className="mt-0.5 truncate text-[10px] text-[#999]">{profile.last_event?.name ?? "No event"}</p></td>
    <td className="px-6 py-4 text-right"><p className="text-[12px] text-[#555]">{formatRelativeTime(profile.last_seen_at)}</p><p className="mt-0.5 text-[10px] text-[#999]">Since {formatDate(profile.first_seen_at)}</p></td>
  </tr>;
}

function SummaryCard({ label, value, icon: Icon, loading }: { label: string; value: string; icon: typeof Users; loading: boolean }) {
  return <div className={cn("rounded-[28px] p-5", panelGlassClass)}><div className="flex items-start justify-between"><p className="text-[12px] text-[#858585]">{label}</p><Icon className="h-4 w-4 text-[#a0a0a0]" strokeWidth={1.7} /></div><p className={cn("mt-5 text-[24px] font-semibold tracking-[-0.04em]", loading && "animate-pulse text-[#bbb]")}>{value}</p></div>;
}

function EmptyAudienceState({ searched }: { searched: boolean }) {
  return <div className="px-6 py-16 text-center"><h3 className="text-sm font-medium text-neutral-700">{searched ? "No matching people" : "Your audience is empty"}</h3><p className="mx-auto mt-2 max-w-[360px] text-xs font-light leading-5 text-neutral-400">{searched ? "Try a different name, email, company, or event." : "Send an identifiable event from one of your connected applications and the profile will appear here."}</p></div>;
}

function getProfileName(profile: AudienceProfile) {
  return profile.full_name?.trim() || [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || profile.email || "Anonymous user";
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }
function formatRelativeTime(value: string) { const elapsed = Date.now() - new Date(value).getTime(); const minutes = Math.max(1, Math.floor(elapsed / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); if (days < 30) return `${days}d ago`; return `${Math.floor(days / 30)}mo ago`; }
