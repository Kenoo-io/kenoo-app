"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageCircleMore, Save, Smartphone } from "lucide-react";

import { cn } from "@walls/utils";

const channelDetails = {
  email: { label: "Email", description: "Build a rich message with a subject line and formatted content.", icon: Mail, color: "bg-[#edf5ff] text-[#4776b8]" },
  sms: { label: "SMS", description: "Write a concise message for direct, personal communication.", icon: MessageCircleMore, color: "bg-[#eef8f2] text-[#238252]" },
  push: { label: "Push", description: "Create a notification that brings people back to your product.", icon: Smartphone, color: "bg-[#f3f0ff] text-[#7258c9]" },
} as const;

export function CreateTemplatePage({ channel }: { channel: string }) {
  const router = useRouter();
  const key = channel.toLowerCase() as keyof typeof channelDetails;
  const details = channelDetails[key] ?? channelDetails.email;
  const Icon = details.icon;
  const isPush = key === "push";
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [actionUrl, setActionUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, channel: key, title, textContent: message, actionUrl, imageUrl }) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Unable to save template");
      setSaving(false);
      return;
    }
    router.push("/templates");
  }

  return <div className="min-h-full bg-kenoo-white"><div className="mx-auto max-w-[1000px] px-6 py-8 sm:px-10 lg:px-12"><Link href="/templates" className="inline-flex items-center gap-2 text-[12px] text-[#888] transition hover:text-[#333]"><ArrowLeft className="h-3.5 w-3.5" /> Back to templates</Link><header className="mt-8"><div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", details.color)}><Icon className="h-5 w-5" strokeWidth={1.6} /></div><p className="mb-2 mt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">New {details.label.toLowerCase()} template</p><h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Create a {details.label} template</h1><p className="mt-2 max-w-xl text-[13px] font-light leading-6 text-[#858585]">{details.description}</p></header><form onSubmit={saveTemplate} className="mt-8 rounded-[28px] bg-white/80 p-6 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-8"><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Template name</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={isPush ? "e.g. Order ready" : "e.g. Appointment reminder"} className="form-input" /></label><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Description <span className="font-normal text-[#aaa]">(optional)</span></span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this template for?" className="form-input" /></label>{isPush ? <><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Notification title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Your order is ready" className="form-input" /></label><label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Message</span><textarea required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Order #1234 is ready for pickup." className="min-h-28 w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#999] focus:ring-2 focus:ring-black/[0.04]" /></label><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Action link <span className="font-normal text-[#aaa]">(optional)</span></span><input type="url" value={actionUrl} onChange={(event) => setActionUrl(event.target.value)} placeholder="https://app.example.com/orders/1234" className="form-input" /></label><label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Image URL <span className="font-normal text-[#aaa]">(optional)</span></span><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." className="form-input" /></label></div></> : <label className="mt-5 block"><span className="mb-1.5 block text-[12px] font-medium text-[#555]">Message</span><textarea required maxLength={1600} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Hi {{first_name}}, just a quick reminder..." className="min-h-36 w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#333] outline-none placeholder:text-[#aaa] focus:border-[#999] focus:ring-2 focus:ring-black/[0.04]" /><span className="mt-1.5 block text-right text-[11px] text-[#aaa]">{message.length}/1600</span></label>}{error ? <p className="mt-4 text-[12px] text-red-500">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><Link href="/templates" className="rounded-lg px-3.5 py-2.5 text-[12px] font-medium text-[#666] transition hover:bg-[#f5f5f5]">Cancel</Link><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#111] px-3.5 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-wait disabled:opacity-60"><Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save template"}</button></div></form></div></div>;
}
