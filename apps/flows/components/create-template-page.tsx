"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Mail, MessageCircleMore, Sparkles } from "lucide-react";

import { cn } from "@walls/utils";

const channelDetails = {
  email: { label: "Email", description: "Build a rich message with a subject line and formatted content.", icon: Mail, color: "bg-[#edf5ff] text-[#4776b8]" },
  sms: { label: "SMS", description: "Write a concise message for direct, personal communication.", icon: MessageCircleMore, color: "bg-[#eef8f2] text-[#238252]" },
  push: { label: "Push", description: "Create a notification that brings people back to your product.", icon: Sparkles, color: "bg-[#f3f0ff] text-[#7258c9]" },
} as const;

export function CreateTemplatePage({ channel }: { channel: string }) {
  const details = channelDetails[channel.toLowerCase() as keyof typeof channelDetails] ?? channelDetails.email;
  const Icon = details.icon;

  return <div className="min-h-full bg-kenoo-white"><div className="mx-auto max-w-[1000px] px-6 py-8 sm:px-10 lg:px-12"><Link href="/templates" className="inline-flex items-center gap-2 text-[12px] text-[#888] transition hover:text-[#333]"><ArrowLeft className="h-3.5 w-3.5" /> Back to templates</Link><header className="mt-8"><div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", details.color)}><Icon className="h-5 w-5" strokeWidth={1.6} /></div><p className="mb-2 mt-5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#9b9b9b]">New {details.label.toLowerCase()} template</p><h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#111]">Create a {details.label} template</h1><p className="mt-2 max-w-xl text-[13px] font-light leading-6 text-[#858585]">{details.description}</p></header><section className="mt-8 rounded-[28px] bg-white/80 p-8 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]"><div className="flex min-h-[260px] flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f5] text-[#888]"><FileText className="h-5 w-5" strokeWidth={1.5} /></span><h2 className="mt-5 text-[15px] font-medium text-[#222]">{details.label} editor coming next</h2><p className="mt-2 max-w-[390px] text-[12px] font-light leading-5 text-[#999]">This channel now has its own creation path. We’ll add the {details.label.toLowerCase()}-specific editor and saving flow here.</p></div></section></div></div>;
}
