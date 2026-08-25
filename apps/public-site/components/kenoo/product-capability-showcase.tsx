"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  CircleDollarSign,
  Handshake,
  Heart,
  Layers,
  Link2,
  Mail,
  Megaphone,
  MousePointerClick,
  Pencil,
  Phone,
  Plus,
  Shield,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useId } from "react";

import { ChromeFrame } from "@/components/kenoo/chrome-frame";
import type {
  CapabilityFeatureIcon,
  CapabilitySection,
  FeaturedProduct,
} from "@/lib/featured-products";
import { cn } from "@/lib/utils";

const PANEL_GLASS =
  "bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

const SKY = "#6eadc0";
const YELLOW = "#e2f85c";
const BLUE = "#0066b2";

const ICON_MAP: Record<CapabilityFeatureIcon, LucideIcon> = {
  link: Link2,
  megaphone: Megaphone,
  wallet: Wallet,
  shield: Shield,
  sparkles: Sparkles,
  layers: Layers,
  users: Users,
  building: Building2,
  handshake: Handshake,
  mail: Mail,
  activity: Activity,
  utensils: UtensilsCrossed,
  target: Target,
  heart: Heart,
};

const floatEase = [0.22, 1, 0.36, 1] as const;

type ProductCapabilityShowcaseProps = {
  product: FeaturedProduct;
};

export function ProductCapabilityShowcase({
  product,
}: ProductCapabilityShowcaseProps) {
  return (
    <div className="border-t border-kenoo-border bg-kenoo-canvas">
      {product.capabilitySections.map((section, index) => (
        <CapabilityBlock
          key={section.title}
          section={section}
          accent={product.accent}
          reverse={index % 2 === 1}
          isLast={index === product.capabilitySections.length - 1}
        />
      ))}
    </div>
  );
}

function CapabilityBlock({
  section,
  accent,
  reverse,
  isLast,
}: {
  section: CapabilitySection;
  accent: string;
  reverse: boolean;
  isLast: boolean;
}) {
  return (
    <section
      className={cn(
        "mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24",
        !isLast && "border-b border-kenoo-border",
      )}
    >
      <div
        className={cn(
          "grid items-center gap-10 lg:grid-cols-2 lg:gap-14",
          reverse && "lg:[&>*:first-child]:order-2",
        )}
      >
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-4xl">
            {section.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-kenoo-muted md:text-lg">
            {section.description}
          </p>
        </div>
        <CapabilityVisual visual={section.visual} accent={accent} />
      </div>

      <ul className="mt-14 grid border-t border-kenoo-border sm:grid-cols-2 lg:grid-cols-4">
        {section.features.map((feature) => {
          const Icon = ICON_MAP[feature.icon];
          return (
            <li
              key={feature.title}
              className="group border-b border-kenoo-border p-5 transition-colors hover:bg-kenoo-subtle/60 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(4n)]:border-r-0"
            >
              <Icon
                className="size-5 text-kenoo-ink"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="mt-4 font-display text-base font-semibold tracking-[-0.02em] text-kenoo-ink">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-kenoo-muted">
                {feature.description}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CapabilityVisual({
  visual,
  accent,
}: {
  visual: CapabilitySection["visual"];
  accent: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: floatEase }}
      className="relative"
      aria-hidden
    >
      {visual === "adpilot-performance" ? (
        <AdPilotPerformanceVisual />
      ) : null}
      {visual === "adpilot-automation" ? (
        <AdPilotAutomationVisual />
      ) : null}
      {visual === "adpilot-preview" ? <AdPilotPreviewVisual /> : null}
      {visual === "crm-pipeline" ? <CrmPipelineVisual /> : null}
      {visual === "crm-outreach" ? <CrmOutreachVisual /> : null}
      {visual === "crm-contact" ? <CrmContactVisual /> : null}
      {visual === "health-energy" ? <HealthEnergyVisual /> : null}
      {visual === "health-meals" ? <HealthMealsVisual /> : null}
      {visual === "health-pulse" ? <HealthPulseVisual accent={accent} /> : null}
    </motion.div>
  );
}

function FloatPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("absolute z-10", className)}>{children}</div>;
}

function AdPilotPerformanceVisual() {
  const fillId = useId();
  const stats: {
    label: string;
    value: string;
    change: string;
    icon: LucideIcon;
    accent: string;
  }[] = [
    {
      label: "Ad spend",
      value: "$24.8k",
      change: "12%",
      icon: CircleDollarSign,
      accent: SKY,
    },
    {
      label: "Impressions",
      value: "1.24M",
      change: "8%",
      icon: TrendingUp,
      accent: BLUE,
    },
    {
      label: "CTR",
      value: "3.9%",
      change: "0.4",
      icon: MousePointerClick,
      accent: "#00d1c1",
    },
    {
      label: "ROAS",
      value: "4.2x",
      change: "0.3",
      icon: TrendingUp,
      accent: "#10b981",
    },
    {
      label: "Website purchases",
      value: "186",
      change: "18%",
      icon: ShoppingBag,
      accent: "#f59e0b",
    },
    {
      label: "Purchase value",
      value: "$104k",
      change: "14%",
      icon: CircleDollarSign,
      accent: "#7a04eb",
    },
  ];

  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-[#fcfcfc]">
        <div className={cn("mx-3 mt-3 overflow-hidden rounded-[28px]", PANEL_GLASS)}>
          <div className="grid grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    "flex min-w-0 items-center gap-2 border-neutral-200/80 px-2.5 py-2.5",
                    "border-b border-r last:border-r-0 [&:nth-child(3n)]:border-r-0",
                    "[&:nth-last-child(-n+3)]:border-b-0",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
                    <Icon
                      className="h-3.5 w-3.5"
                      strokeWidth={1.8}
                      style={{ color: stat.accent }}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-light text-neutral-500">
                      {stat.label}
                    </p>
                    <p className="flex items-baseline gap-1 text-sm font-semibold tabular-nums tracking-tight text-neutral-900">
                      {stat.value}
                      <span className="text-[9px] font-medium text-emerald-600">
                        +{stat.change}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={cn("relative mx-3 mt-3 mb-3 rounded-[28px] px-4 py-4", PANEL_GLASS)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              Spend trend
            </p>
            <span className="rounded-full border border-neutral-200/80 bg-white/90 px-2.5 py-0.5 text-[10px] font-light uppercase tracking-wider text-neutral-500 shadow-sm">
              Preview
            </span>
          </div>
          <div className="mt-2 flex gap-3">
            {[
              { label: "Spend", color: SKY },
              { label: "Purchase value", color: YELLOW },
              { label: "Impressions", color: BLUE },
            ].map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1.5 text-[10px] font-light tracking-wider text-neutral-400"
              >
                <span
                  className="h-0.5 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
          </div>
          <svg viewBox="0 0 420 120" className="mt-2 h-28 w-full" aria-hidden>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SKY} stopOpacity="0.28" />
                <stop offset="100%" stopColor={SKY} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 88 C40 82, 70 70, 100 74 C140 80, 170 48, 210 52 C250 56, 280 30, 320 36 C360 42, 390 22, 420 28 L420 120 L0 120 Z"
              fill={`url(#${fillId})`}
            />
            <path
              d="M0 88 C40 82, 70 70, 100 74 C140 80, 170 48, 210 52 C250 56, 280 30, 320 36 C360 42, 390 22, 420 28"
              fill="none"
              stroke={SKY}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M0 96 C50 90, 90 102, 140 86 C190 70, 240 92, 300 78 C360 64, 390 72, 420 58"
              fill="none"
              stroke={YELLOW}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M0 70 C60 78, 110 58, 160 64 C220 72, 270 44, 330 50 C370 54, 400 40, 420 46"
              fill="none"
              stroke={BLUE}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <FloatPanel
        className="right-[-2%] top-[36%] w-[10.5rem] sm:right-[-4%] sm:w-[11.5rem]"
       
      >
        <div className="rounded-lg border border-neutral-500/80 bg-neutral-700 px-3 py-2.5 text-white shadow-lg">
          <p className="text-[10px] font-medium text-white/55">Aug 18</p>
          <div className="mt-1.5 space-y-1">
            {[
              { label: "Spend", value: "$1,240" },
              { label: "Purchase value", value: "$5,180" },
              { label: "Impressions", value: "48.2k" },
              { label: "CTR", value: "3.9%" },
              { label: "ROAS", value: "4.2x" },
              { label: "CPA", value: "$18.40" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 text-[11px]"
              >
                <span className="text-white/60">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-white/10 pt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-white/60">Profit</span>
            <span className="font-medium tabular-nums text-emerald-300">
              +$3,940
            </span>
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function AdPilotAutomationVisual() {
  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[28px] px-4 py-5 md:px-5 md:py-6",
          PANEL_GLASS,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-neutral-900">
              Guardrails
            </p>
            <p className="mt-1 text-xs font-light leading-relaxed text-neutral-500">
              Objective-aware stop-loss protection based on this entity&apos;s
              live campaign context.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[rgba(110,173,192,0.45)] bg-white/40 px-2.5 py-0.5 text-[11px] shadow-[0_0_0_1px_rgba(110,173,192,0.35),0_0_12px_rgba(110,173,192,0.25)]">
            AdPilot
          </span>
        </div>

        <div className="mt-4 inline-flex rounded-full border border-white/70 bg-white/55 p-1 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
          <span className="rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Stop-loss
          </span>
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-700 shadow-[0_4px_14px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-black/[0.04]">
            Break-Even ROAS
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-black/[0.06] bg-neutral-100/50 px-3.5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              Automation preset
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-900">
              Balanced ROAS
            </p>
            <p className="text-[11px] font-light text-neutral-500">
              Optimize for ROAS · Default
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Max daily increase", value: "15%" },
              { label: "Max daily decrease", value: "12%" },
              { label: "Cooldown", value: "24 hours" },
              { label: "When breached", value: "Stop & email" },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-white/70 bg-white/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl"
              >
                <p className="text-[10px] font-light text-neutral-500">
                  {row.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-900">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-light text-neutral-500">
            Active stop-loss metric:{" "}
            <span className="font-medium text-neutral-700">ROAS</span>. Sales
            campaigns can also calculate true break-even ROAS from profit per
            sale.
          </p>
        </div>
      </div>

      <FloatPanel
        className="left-[-2%] top-[12%] w-[12rem] sm:left-[-6%] sm:w-[13.5rem]"
       
      >
        <div
          className={cn(
            "rounded-2xl border border-black/[0.08] bg-neutral-200/40 p-4 shadow-[0_20px_48px_-16px_rgba(17,17,17,0.35),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl",
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            You need at least
          </p>
          <p className="mt-2 font-display text-4xl font-semibold tabular-nums tracking-[-0.04em] text-neutral-900">
            2.00x
          </p>
          <p className="mt-1 text-xs font-light leading-relaxed text-neutral-500">
            ROAS to break even after all business costs.
          </p>
          <div className="mt-3 border-t border-black/[0.06] pt-3">
            <p className="text-[10px] font-light text-neutral-500">
              Profit kept per sale (%)
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-900">
              50%
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["100% · 1.00x", "50% · 2.00x", "25% · 4.00x"].map((chip) => (
                <span
                  key={chip}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    chip.startsWith("50%")
                      ? "bg-white/90 text-neutral-800 shadow-sm ring-1 ring-black/[0.04]"
                      : "bg-white/40 text-neutral-500",
                  )}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function AdPilotPreviewVisual() {
  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-[#fcfcfc]">
        <div className="flex h-full flex-col items-center justify-center px-6 py-8">
          <div className="mb-6 w-full max-w-[16rem]">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-200/80 bg-white/70 px-3.5 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  Summer retargeting
                </p>
                <p className="text-[11px] font-light text-neutral-500">
                  Meta · Active · $420/day
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[rgba(110,173,192,0.45)] bg-white/40 px-2 py-0.5 text-[10px] shadow-[0_0_0_1px_rgba(110,173,192,0.35),0_0_12px_rgba(110,173,192,0.25)]">
                AdPilot
              </span>
            </div>
          </div>

          <ChromeFrame className="w-full max-w-sm rounded-[28px]">
            <div
              className={cn(
                "flex flex-col items-center gap-3 rounded-[26.5px] px-6 py-8 text-center",
                PANEL_GLASS,
              )}
            >
              <span className="relative flex h-12 w-12 items-center justify-center">
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" />
                <Sparkles className="relative h-5 w-5 text-neutral-700" />
              </span>
              <span>
                <span className="block text-lg font-semibold tracking-tight text-neutral-900">
                  Generate preview
                </span>
                <span className="mt-1 block text-xs font-light text-neutral-500">
                  Dry-run the next budget decision - nothing applies yet
                </span>
              </span>
            </div>
          </ChromeFrame>
        </div>
      </div>

      <FloatPanel
        className="right-[-3%] top-[8%] w-[13.5rem] sm:right-[-5%] sm:w-[15.5rem]"
       
      >
        <div className={cn("overflow-hidden rounded-[28px]", PANEL_GLASS)}>
          <div className="border-b border-neutral-200/80 px-4 py-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              Decision
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-light tabular-nums text-neutral-400 line-through">
                $420.00
              </span>
              <ArrowRight className="relative top-0.5 h-3.5 w-3.5 shrink-0 text-neutral-300" />
              <span className="text-2xl font-semibold tracking-tight tabular-nums text-neutral-900">
                $483.00
                <span className="ml-1 text-sm font-light text-neutral-400">
                  /day
                </span>
              </span>
              <span className="text-xs font-medium tabular-nums text-emerald-600">
                +15.0%
              </span>
            </div>
            <span className="mt-3 inline-flex rounded-full border border-neutral-300/80 bg-white/70 px-3 py-1.5 text-[11px] font-medium tracking-tight text-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl">
              Apply changes now
            </span>
            <p className="mt-2 text-[10px] font-light text-neutral-500">
              Updates Meta immediately and logs this in budget history.
            </p>
          </div>
          <div className="border-b border-neutral-200/80 px-4 py-3.5">
            <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              <Sparkles className="h-3 w-3" />
              Why
              <span className="font-light normal-case tracking-normal text-neutral-400">
                · algorithm · 78% confidence
              </span>
            </p>
            <p className="mt-2 text-[11px] font-light leading-5 text-neutral-700">
              ROAS is growing above baseline with room under the max daily
              increase cap.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-neutral-200/80">
            {[
              { label: "Trend", value: "Growing" },
              { label: "ROAS", value: "4.2x / 3.6x" },
              { label: "Allowed range", value: "$200 - $600" },
              { label: "State", value: "Active" },
            ].map((cell) => (
              <div key={cell.label} className="bg-white/80 px-3 py-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wider text-neutral-400">
                  {cell.label}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-neutral-900">
                  {cell.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function CrmPipelineVisual() {
  const deals = [
    {
      name: "Northline retainer",
      amount: "$48k",
      date: "August 12",
      tone: "bg-[#0066b2] text-white",
      muted: "text-white/75",
    },
    {
      name: "Harbor Collective",
      amount: "$22k",
      date: "August 18",
      tone: "bg-[#6eadc0] text-white",
      muted: "text-white/75",
    },
    {
      name: "Veld kickoff",
      amount: "$61k",
      date: "August 4",
      tone: "bg-kenoo-ink text-white",
      muted: "text-white/75",
    },
    {
      name: "Atlas retail",
      amount: "$19k",
      date: "August 21",
      tone: "bg-[#e2f85c] text-neutral-900",
      muted: "text-neutral-500",
    },
  ];

  const funnel = [
    { name: "Proposal", value: "48,000$", deals: 3, width: "92%", offset: "0%" },
    { name: "Negotiation", value: "22,000$", deals: 2, width: "78%", offset: "10%" },
    { name: "Verbal", value: "61,000$", deals: 1, width: "64%", offset: "18%" },
  ];

  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[2rem] border border-black/[0.04] bg-white p-4",
          "shadow-[0_10px_32px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]",
        )}
      >
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold tracking-tight text-neutral-900">
              Recent interactions
            </p>
            <p className="text-[11px] text-neutral-400">August pipeline</p>
          </div>
          <span className="rounded-full bg-[#e2f85c] px-2.5 py-1 text-[10px] font-medium text-neutral-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
            +12% week
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {deals.map((deal) => (
            <div
              key={deal.name}
              className={cn(
                "flex min-h-[96px] flex-col justify-between overflow-hidden rounded-[22px] p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)] ring-1 ring-white/20",
                deal.tone,
              )}
            >
              <div>
                <p className={cn("text-[10px] font-medium", deal.muted)}>
                  {deal.date}
                </p>
                <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug">
                  {deal.name}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{deal.amount}</p>
            </div>
          ))}
        </div>
      </div>

      <FloatPanel className="right-[-4%] top-[10%] w-[11.5rem] sm:right-[-6%] sm:w-[13rem]">
        <div
          className={cn(
            "rounded-[2rem] border border-black/[0.04] bg-white p-4",
            "shadow-[0_20px_48px_-16px_rgba(17,17,17,0.35),0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold tracking-tight text-neutral-900">
              Stage Funnel
            </p>
            <div className="flex rounded-full border border-black/[0.04] bg-neutral-50 p-0.5 text-[9px] font-medium">
              <span className="rounded-full bg-white px-2 py-1 text-neutral-800 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                Weighted
              </span>
              <span className="px-2 py-1 text-neutral-400">Total</span>
            </div>
          </div>
          <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-neutral-900">
            $131,000
          </p>
          <p className="text-[10px] text-neutral-400">Total in Pipeline</p>
          <div className="mt-3 space-y-2">
            {funnel.map((row) => (
              <div
                key={row.name}
                className="rounded-full border border-black/[0.04] bg-white px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03]"
                style={{ width: row.width, marginLeft: row.offset }}
              >
                <p className="truncate text-[9px] font-medium text-neutral-500">
                  {row.name}
                </p>
                <p className="truncate text-[11px] font-semibold tabular-nums text-neutral-900">
                  {row.value}
                  <span className="ml-1 text-[9px] font-normal text-neutral-400">
                    · {row.deals}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function CrmOutreachVisual() {
  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[2rem] border border-black/[0.04] bg-white",
          "shadow-[0_10px_32px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]",
        )}
      >
        <div className="border-b border-black/[0.04] px-4 py-3">
          <p className="text-[11px] text-neutral-400">Sequence · Step 2</p>
          <p className="text-sm font-semibold tracking-tight text-neutral-900">
            Brand partnership follow-up
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border border-black/[0.04] bg-neutral-50 px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
              Subject
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-900">
              Quick note on the August campaign
            </p>
          </div>
          <div className="min-h-[8.5rem] rounded-2xl border border-black/[0.04] px-3.5 py-3">
            <p className="text-sm leading-relaxed text-neutral-500">
              Hi Maya - circling back on the creator roster we shared last week.
              Happy to tighten the brief around the summer drop…
            </p>
            <span className="mt-3 inline-block h-4 w-0.5 animate-pulse bg-[#0066b2]" />
          </div>
          <div className="flex items-center justify-end gap-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full">
              <Sparkles className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
            </span>
          </div>
        </div>
      </div>

      <FloatPanel className="left-[-2%] top-[16%] w-[13rem] sm:left-[-6%] sm:w-[15rem]">
        <div className="rounded-[2rem] border border-white/30 bg-white/80 p-4 shadow-2xl backdrop-blur-xl">
          <div className="rounded-full border border-neutral-200/50 bg-neutral-100 py-2.5 pl-3 pr-3 shadow-inner backdrop-blur-md">
            <p className="truncate text-sm text-neutral-700">
              Make it shorter and warmer
            </p>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1 pl-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full">
              <X className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[inset_0_4px_8px_rgba(0,0,0,0.08)] ring-1 ring-neutral-200">
              <Sparkles className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
            </span>
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function CrmContactVisual() {
  const actions = [
    { icon: Pencil, label: "Edit" },
    { icon: Mail, label: "Email" },
    { icon: Phone, label: "Call" },
    { icon: Plus, label: "Add" },
    { icon: Calendar, label: "Schedule" },
  ];

  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[2rem] border border-black/[0.04] bg-[#f7f8fa] p-4",
          "shadow-[0_10px_32px_rgba(15,23,42,0.08)]",
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-full max-w-[16rem] flex-col items-center rounded-[2rem] border border-black/[0.04] bg-white px-5 py-6 text-center",
            "shadow-[0_10px_32px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]",
          )}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-neutral-100 text-xl font-semibold text-neutral-500 shadow-[0_8px_24px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04]">
            MC
          </div>
          <h3 className="mt-4 text-base font-semibold tracking-tight text-neutral-900">
            Maya Chen
          </h3>
          <p className="mt-1 text-[11px] text-neutral-500">
            Brand Partnerships, Harbor Collective
          </p>
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {actions.map(({ icon: Icon, label }) => (
              <span
                key={label}
                title={label}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.04] bg-white text-neutral-500 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
            ))}
          </div>
          <div className="mt-5 w-full space-y-2 text-left">
            {[
              { label: "Email", value: "maya@harbor.co" },
              { label: "Phone", value: "+1 (415) 555-0142" },
            ].map((field) => (
              <div
                key={field.label}
                className="rounded-2xl border border-black/[0.04] bg-neutral-50 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
              >
                <p className="text-[9px] font-medium uppercase tracking-wider text-neutral-400">
                  {field.label}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-neutral-800">
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FloatPanel className="right-[-3%] top-[18%] w-[10.5rem] sm:right-[-5%] sm:w-[11.5rem]">
        <div
          className={cn(
            "rounded-[2rem] border border-black/[0.04] bg-white px-4 py-4",
            "shadow-[0_20px_48px_-16px_rgba(17,17,17,0.35)] ring-1 ring-black/[0.03]",
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
            Last contacted
          </p>
          <p className="mt-2 text-sm font-semibold tracking-tight text-neutral-900">
            08/18/2026
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">at 2:14 PM</p>
          <div className="mt-3 border-t border-black/[0.04] pt-3">
            <p className="text-[10px] text-neutral-400">Open deals</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">
              $22k
            </p>
            <p className="text-[11px] text-neutral-500">Harbor Collective</p>
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function HealthEnergyVisual() {
  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-[#f7f8fa] p-3.5 shadow-[0_24px_60px_-36px_rgba(17,17,17,0.35)]">
        <div className="grid h-full grid-cols-2 gap-3">
          <div
            className="relative flex flex-col justify-between overflow-hidden rounded-[28px] p-4 text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]"
            style={{
              background:
                "linear-gradient(145deg, #4a6b52 0%, #6f8f6a 42%, #9bb58a 100%)",
            }}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
              Energy balance
            </p>
            <div className="relative z-10 pt-8">
              <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em]">
                842
              </p>
              <p className="mt-1.5 text-xs font-light text-white/70">
                Remaining · 1,240 burned
              </p>
            </div>
            <svg
              viewBox="0 0 200 200"
              className="pointer-events-none absolute -right-6 -bottom-8 h-36 w-36 opacity-40"
              aria-hidden
            >
              {[40, 58, 76, 94].map((r) => (
                <circle
                  key={r}
                  cx="100"
                  cy="100"
                  r={r}
                  fill="none"
                  stroke="white"
                  strokeWidth="0.8"
                  opacity={0.55}
                />
              ))}
            </svg>
          </div>
          <div className="flex flex-col gap-3">
            <div
              className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[28px] p-3.5 text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]"
              style={{
                background:
                  "linear-gradient(135deg, #6eadc0 0%, #f0a060 48%, #e86b5a 100%)",
              }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/75">
                Steps
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-[-0.04em]">
                8,420
              </p>
            </div>
            <div
              className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[28px] p-3.5 text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]"
              style={{
                background:
                  "linear-gradient(145deg, #f0c35a 0%, #f59e3b 48%, #ff8a4c 100%)",
              }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/75">
                Protein
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-[-0.04em]">
                96g
              </p>
            </div>
          </div>
        </div>
      </div>

      <FloatPanel className="right-[-3%] top-[14%] w-[10rem] sm:right-[-5%] sm:w-[11rem]">
        <div
          className={cn(
            "rounded-[28px] border border-white/70 bg-white/80 px-4 py-4 backdrop-blur-xl",
            "shadow-[0_20px_48px_-16px_rgba(17,17,17,0.35),inset_0_1px_0_rgba(255,255,255,0.95)]",
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
            Macros
          </p>
          <div className="mt-3 space-y-2.5">
            {[
              { label: "Protein", value: "96g", pct: "78%", color: "#6eadc0" },
              { label: "Carbs", value: "184g", pct: "62%", color: "#f0a060" },
              { label: "Fat", value: "58g", pct: "71%", color: "#e2f85c" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-light text-neutral-600">
                    {row.label}
                  </p>
                  <p className="text-[11px] font-medium tabular-nums text-neutral-800">
                    {row.value}
                  </p>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200/80">
                  <div
                    className="h-full rounded-full"
                    style={{ width: row.pct, background: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function HealthMealsVisual() {
  const meals = [
    { name: "Oats & berries", kcal: "420 kcal", type: "Breakfast" },
    { name: "Chicken bowl", kcal: "680 kcal", type: "Lunch" },
    { name: "Salmon + greens", kcal: "558 kcal", type: "Dinner" },
  ];

  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[28px] border border-neutral-200 bg-white",
          "shadow-[0_24px_60px_-36px_rgba(17,17,17,0.35)]",
        )}
      >
        <div className="border-b border-neutral-200 px-4 py-3">
          <p className="text-sm font-medium tracking-tight text-neutral-900">
            Today&apos;s meals
          </p>
          <p className="text-[11px] font-light text-neutral-500">
            1,658 kcal logged
          </p>
        </div>
        <div className="divide-y divide-neutral-200">
          {meals.map((meal) => (
            <div
              key={meal.name}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  {meal.type}
                </p>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">
                  {meal.name}
                </p>
              </div>
              <span className="text-[11px] font-light tabular-nums text-neutral-500">
                {meal.kcal}
              </span>
            </div>
          ))}
        </div>
      </div>

      <FloatPanel className="left-[-2%] top-[12%] w-[12.5rem] sm:left-[-6%] sm:w-[14rem]">
        <div
          className={cn(
            "rounded-[28px] border border-neutral-200 bg-white px-4 py-4",
            "shadow-[0_20px_48px_-16px_rgba(17,17,17,0.35)]",
          )}
        >
          <p className="text-sm font-medium text-neutral-900">Quick log</p>
          <p className="mt-0.5 text-[11px] font-light text-neutral-500">
            Add what you ate
          </p>
          <div className="mt-3 space-y-2">
            <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <p className="text-[9px] text-neutral-400">Meal</p>
              <p className="text-xs font-medium text-neutral-800">Lunch</p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <p className="text-[9px] text-neutral-400">Food / meal</p>
              <p className="text-xs font-medium text-neutral-800">
                Chicken salad bowl
              </p>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Cal", value: "650" },
                { label: "P", value: "40" },
                { label: "C", value: "55" },
                { label: "F", value: "22" },
              ].map((cell) => (
                <div
                  key={cell.label}
                  className="rounded-md border border-neutral-200 px-1.5 py-1.5 text-center"
                >
                  <p className="text-[8px] text-neutral-400">{cell.label}</p>
                  <p className="text-[10px] font-medium tabular-nums text-neutral-800">
                    {cell.value}
                  </p>
                </div>
              ))}
            </div>
            <span className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#e2f85c] px-3 py-2 text-[11px] font-medium text-neutral-900">
              <Plus className="h-3 w-3" strokeWidth={2} />
              Log meal
            </span>
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function HealthPulseVisual({ accent }: { accent: string }) {
  const pulseId = useId();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = 72;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_24px_60px_-36px_rgba(17,17,17,0.35)]">
        <h3 className="max-w-[12rem] text-xl font-semibold tracking-[-0.04em] text-neutral-900 md:text-2xl">
          How&apos;s your day closing in?
        </h3>
        <div className="relative mx-auto mt-4 flex h-[11.5rem] w-[11.5rem] items-center justify-center md:h-[13rem] md:w-[13rem]">
          <div
            aria-hidden
            className="absolute inset-5 rounded-full opacity-80"
            style={{
              background:
                "radial-gradient(circle, rgba(206,255,0,0.18) 0%, rgba(255,113,48,0.08) 45%, transparent 70%)",
            }}
          />
          <svg
            viewBox="0 0 140 140"
            className="h-full w-full -rotate-90"
            aria-hidden
          >
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#e6e6e4"
              strokeWidth="8"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={`url(#${pulseId})`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
            <defs>
              <linearGradient id={pulseId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ceff00" />
                <stop offset="55%" stopColor="#e2f85c" />
                <stop offset="100%" stopColor="#ff7130" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Consumed
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-[-0.05em] text-neutral-900 md:text-3xl">
              1,658
            </p>
            <p className="mt-0.5 text-[10px] font-light text-neutral-500">
              {progress}% of target
            </p>
          </div>
        </div>
        <div className="mt-2 flex justify-between gap-4 px-1">
          {[
            { label: "Remaining", value: "842 kcal" },
            { label: "Burned", value: "1,240" },
            { label: "Steps", value: "8,420" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-400">
                {item.label}
              </p>
              <p className="mt-0.5 text-xs font-medium text-neutral-800">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <FloatPanel className="right-[-3%] top-[12%] w-[10.5rem] sm:right-[-5%] sm:w-[11.5rem]">
        <div
          className={cn(
            "rounded-[28px] border border-white/70 bg-white/85 px-4 py-4 backdrop-blur-xl",
            "shadow-[0_20px_48px_-16px_rgba(17,17,17,0.35),inset_0_1px_0_rgba(255,255,255,0.95)]",
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
            Goals
          </p>
          <div className="mt-3 space-y-2">
            {[
              "10k steps daily",
              "Workout 3x / week",
              "30 km per week",
            ].map((goal, i) => (
              <div
                key={goal}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-light",
                  i === 0
                    ? "border-white/70 bg-white/90 font-medium text-neutral-800 shadow-sm"
                    : "border-transparent bg-neutral-100/80 text-neutral-500",
                )}
              >
                {i === 0 ? (
                  <span className="mr-1.5 inline-block size-1.5 rounded-full" style={{ backgroundColor: accent }} />
                ) : null}
                {goal}
              </div>
            ))}
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}
