"use client";
/* eslint-disable @next/next/no-img-element -- branding URLs are user-configured R2 assets. */

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ImagePlus, Loader2, Upload } from "lucide-react";
import Link from "next/link";

type Branding = {
  primary_color: string;
  secondary_color: string;
  dark_logo_url: string | null;
  light_logo_url: string | null;
};

const defaults: Branding = {
  primary_color: "#111111",
  secondary_color: "#f4f4f5",
  dark_logo_url: null,
  light_logo_url: null,
};

function LogoUpload({ label, hint, url, disabled, onUpload }: { label: string; hint: string; url: string | null; disabled: boolean; onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-neutral-900">{label}</p><p className="mt-1 text-xs font-light leading-5 text-neutral-500">{hint}</p></div>
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"><Upload className="h-3.5 w-3.5" /> Upload</button>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ""; }} />
      <div className={`mt-4 flex aspect-square w-full items-center justify-center rounded-xl px-5 ${label.startsWith("Dark") ? "bg-neutral-100" : "bg-neutral-800"}`}>
        {url ? <img src={url} alt={`${label} preview`} className="max-h-[85%] max-w-[90%] object-contain" /> : <div className={`flex flex-col items-center gap-2 text-xs ${label.startsWith("Dark") ? "text-neutral-400" : "text-white/50"}`}><ImagePlus className="h-5 w-5" />No logo uploaded</div>}
      </div>
    </div>
  );
}

export function BrandingSettingsPage() {
  const [branding, setBranding] = useState<Branding>(defaults);
  const [savedColors, setSavedColors] = useState({ primary_color: defaults.primary_color, secondary_color: defaults.secondary_color });
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"dark" | "light" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/branding").then(async (response) => {
      const payload = (await response.json()) as { branding?: Branding; canManage?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load branding settings");
      const nextBranding = { ...defaults, ...payload.branding };
      setBranding(nextBranding);
      setSavedColors({ primary_color: nextBranding.primary_color, secondary_color: nextBranding.secondary_color });
      setCanManage(Boolean(payload.canManage));
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load branding settings")).finally(() => setLoading(false));
  }, []);

  async function saveColors() {
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/branding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primaryColor: branding.primary_color, secondaryColor: branding.secondary_color }) });
      const payload = (await response.json()) as { branding?: Branding; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to save branding settings");
      const nextBranding = { ...branding, ...payload.branding };
      setBranding(nextBranding);
      setSavedColors({ primary_color: nextBranding.primary_color, secondary_color: nextBranding.secondary_color });
      setMessage("Colors saved");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save branding settings"); }
    finally { setSaving(false); }
  }

  async function uploadLogo(variant: "dark" | "light", file: File) {
    setUploading(variant); setMessage(null); setError(null);
    try {
      const formData = new FormData(); formData.append("file", file); formData.append("target", JSON.stringify({ kind: "branding-logo", variant }));
      const response = await fetch("/api/branding", { method: "POST", body: formData });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to upload logo");
      setBranding((current) => ({ ...current, [variant === "dark" ? "dark_logo_url" : "light_logo_url"]: payload.url })); setMessage(`${variant === "dark" ? "Dark" : "Light"} logo uploaded`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to upload logo"); }
    finally { setUploading(null); }
  }

  const disabled = loading || !canManage || saving || uploading !== null;
  const colorsChanged = branding.primary_color !== savedColors.primary_color || branding.secondary_color !== savedColors.secondary_color;
  return (
    <main className="min-h-full w-full bg-kenoo-white px-6 pb-12 pt-6 md:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header><Link href="/settings" className="group inline-flex items-center gap-2 text-sm font-light text-neutral-500 transition-colors hover:text-neutral-800"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Settings</Link><p className="mt-8 text-xs font-medium uppercase tracking-widest text-neutral-500">Workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Branding</h1><p className="mt-2 max-w-xl text-sm font-light leading-6 text-neutral-500">Customize the colors and logos used to represent your company in Flows.</p></header>
        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><Check className="h-4 w-4" />{message}</p> : null}
        <section className="rounded-[28px] bg-white/80 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] md:p-7">
          <div className="mb-6"><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Colors</p><p className="mt-1.5 text-sm font-light text-neutral-500">Use your company palette to keep customer-facing experiences recognizable.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            {([ ["primary_color", "Primary color"], ["secondary_color", "Secondary color"] ] as const).map(([key, label]) => <label key={key} className="block"><span className="text-sm font-medium text-neutral-800">{label}</span>{loading ? <div className="mt-3 h-11 animate-pulse rounded-xl bg-neutral-100" /> : <div className="mt-3 flex h-11 overflow-hidden rounded-xl border border-neutral-200 bg-white"><input type="color" value={branding[key]} disabled={disabled} onChange={(event) => setBranding((current) => ({ ...current, [key]: event.target.value }))} className="h-full w-12 shrink-0 cursor-pointer appearance-none rounded-none border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-none [&::-webkit-color-swatch]:border-0" /><span className="w-px shrink-0 bg-neutral-200" /><div className="flex min-w-0 flex-1 items-center px-3"><span className="text-sm font-medium text-neutral-400">#</span><input value={branding[key].replace(/^#/, "")} disabled={disabled} onChange={(event) => setBranding((current) => ({ ...current, [key]: `#${event.target.value.replace(/^#/, "")}` }))} className="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium uppercase text-neutral-800 outline-none disabled:text-neutral-400" /></div></div>}</label>)}
          </div>
          <div className="mt-6 flex justify-start"><button type="button" disabled={disabled || !colorsChanged} onClick={() => void saveColors()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200/50 disabled:text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving…" : "Save changes"}</button></div>
        </section>
        <section className="rounded-[28px] bg-white/80 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] md:p-7">
          <div className="mb-6"><p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Logos</p><p className="mt-1.5 text-sm font-light text-neutral-500">We recommend using transparent PNG, SVG, or WebP files.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><LogoUpload label="Dark logo" hint="For light backgrounds" url={branding.dark_logo_url} disabled={disabled || uploading !== null} onUpload={(file) => void uploadLogo("dark", file)} /><LogoUpload label="Light logo" hint="For dark backgrounds" url={branding.light_logo_url} disabled={disabled || uploading !== null} onUpload={(file) => void uploadLogo("light", file)} /></div>
        </section>
        {!loading && !canManage ? <p className="text-sm text-neutral-500">Only workspace owners and admins can update branding.</p> : null}
      </div>
    </main>
  );
}
