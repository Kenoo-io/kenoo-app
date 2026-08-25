"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Building2,
  CircleDollarSign,
  Handshake,
  Heart,
  Layers,
  Link2,
  Mail,
  Megaphone,
  MousePointerClick,
  Shield,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Wallet,
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
      {visual === "crm-pipeline" ? <CrmPipelineVisual accent={accent} /> : null}
      {visual === "crm-outreach" ? <CrmOutreachVisual accent={accent} /> : null}
      {visual === "health-energy" ? (
        <HealthEnergyVisual accent={accent} />
      ) : null}
      {visual === "health-meals" ? <HealthMealsVisual accent={accent} /> : null}
    </motion.div>
  );
}

function FloatPanel({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("absolute z-10", className)}
      animate={
        reduceMotion
          ? undefined
          : { y: [0, -6, 0] }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }
      }
    >
      {children}
    </motion.div>
  );
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
        delay={0.35}
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
        delay={0.2}
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
                  Dry-run the next budget decision — nothing applies yet
                </span>
              </span>
            </div>
          </ChromeFrame>
        </div>
      </div>

      <FloatPanel
        className="right-[-3%] top-[8%] w-[13.5rem] sm:right-[-5%] sm:w-[15.5rem]"
        delay={0.25}
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
              { label: "Allowed range", value: "$200 – $600" },
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

function CrmPipelineVisual({ accent }: { accent: string }) {
  const deals = [
    { name: "Northline retainer", amount: "$48k", tone: "bg-[#0066b2] text-white" },
    { name: "Harbor Collective", amount: "$22k", tone: "bg-[#6eadc0] text-white" },
    { name: "Veld kickoff", amount: "$61k", tone: "bg-kenoo-ink text-white" },
    { name: "Atlas retail", amount: "$19k", tone: "bg-[#e2f85c] text-neutral-900" },
  ];

  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-2xl border border-kenoo-border bg-white shadow-[0_24px_60px_-36px_rgba(17,17,17,0.35)]">
        <div className="border-b border-kenoo-border px-4 py-3">
          <p className="font-display text-sm font-semibold text-kenoo-ink">
            Pipeline
          </p>
          <p className="text-[11px] text-kenoo-muted">$150k total · August</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-4">
          {deals.map((deal) => (
            <div
              key={deal.name}
              className={cn(
                "flex min-h-[88px] flex-col justify-between rounded-2xl p-3",
                deal.tone,
              )}
            >
              <p className="line-clamp-2 text-[12px] font-semibold leading-snug">
                {deal.name}
              </p>
              <p className="text-sm font-semibold tabular-nums">{deal.amount}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-kenoo-border px-4 py-3">
          {[
            { name: "Proposal", value: "$48k", width: "92%" },
            { name: "Negotiation", value: "$22k", width: "74%" },
          ].map((row) => (
            <div
              key={row.name}
              className="rounded-full border border-kenoo-border bg-[#fafafa] px-3.5 py-2"
              style={{ width: row.width }}
            >
              <p className="text-[10px] text-kenoo-muted">{row.name}</p>
              <p className="text-xs font-semibold tabular-nums text-kenoo-ink">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <FloatPanel className="right-[-4%] top-[14%] w-[10rem] sm:right-[-2%] sm:w-[11rem]" delay={0.35}>
        <div className="rounded-2xl bg-kenoo-ink px-4 py-4 text-white shadow-[0_20px_48px_-16px_rgba(17,17,17,0.55)]">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
            Won this month
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-[-0.03em]">
            $86k
          </p>
          <p className="mt-1 text-sm text-white/65">from 4 deals</p>
          <span
            className="mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium text-kenoo-ink"
            style={{ backgroundColor: "#e2f85c" }}
          >
            +12% week
          </span>
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full rounded-full"
              style={{ width: "68%", backgroundColor: accent }}
            />
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function CrmOutreachVisual({ accent }: { accent: string }) {
  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-2xl border border-kenoo-border bg-white shadow-[0_24px_60px_-36px_rgba(17,17,17,0.35)]">
        <div className="border-b border-kenoo-border px-4 py-3">
          <p className="text-[11px] text-kenoo-muted">Sequence · Step 2</p>
          <p className="font-display text-sm font-semibold text-kenoo-ink">
            Brand partnership follow-up
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-xl border border-kenoo-border bg-[#fafafa] px-3.5 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-kenoo-muted">
              Subject
            </p>
            <p className="mt-1 text-sm font-medium text-kenoo-ink">
              Quick note on the August campaign
            </p>
          </div>
          <div className="min-h-[8.5rem] rounded-xl border border-kenoo-border px-3.5 py-3">
            <p className="text-sm leading-relaxed text-kenoo-muted">
              Hi Maya — circling back on the creator roster we shared last week.
              Happy to tighten the brief around the summer drop…
            </p>
            <span
              className="mt-3 inline-block h-4 w-0.5 animate-pulse"
              style={{ backgroundColor: accent }}
            />
          </div>
        </div>
      </div>

      <FloatPanel className="left-[-2%] top-[20%] w-[12rem] sm:left-[-5%] sm:w-[13rem]" delay={0.15}>
        <div className="overflow-hidden rounded-2xl bg-kenoo-ink text-white shadow-[0_20px_48px_-16px_rgba(17,17,17,0.55)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <Sparkles className="size-3.5" style={{ color: accent }} />
            <p className="text-[11px] font-medium tracking-[-0.01em]">
              AI Writer
            </p>
          </div>
          <div className="py-1">
            {[
              "Generate subject line",
              "Rewrite paragraph",
              "Make it shorter",
              "Add talent context",
              "Draft follow-up",
            ].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "px-4 py-2.5 text-sm",
                  i === 1 ? "bg-white/10" : "text-white/80",
                )}
                style={i === 1 ? { color: accent } : undefined}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}

function HealthEnergyVisual({ accent }: { accent: string }) {
  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-2xl border border-kenoo-border bg-[#f7f8fa] shadow-[0_24px_60px_-36px_rgba(17,17,17,0.35)]">
        <div className="grid h-full grid-cols-2 gap-3 p-4">
          <div
            className="flex flex-col justify-between rounded-2xl p-4 text-white"
            style={{
              background:
                "linear-gradient(145deg, #4a6b52 0%, #6f8f6a 42%, #9bb58a 100%)",
            }}
          >
            <p className="text-[11px] text-white/75">Energy balance</p>
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums tracking-[-0.03em]">
                842
              </p>
              <p className="mt-1 text-[11px] text-white/70">
                Remaining · 1,240 burned
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div
              className="flex flex-1 flex-col justify-between rounded-2xl p-3.5 text-white"
              style={{
                background:
                  "linear-gradient(135deg, #6eadc0 0%, #f0a060 48%, #e86b5a 100%)",
              }}
            >
              <p className="text-[11px] text-white/75">Steps</p>
              <p className="font-display text-xl font-semibold tabular-nums">
                8,420
              </p>
            </div>
            <div
              className="flex flex-1 flex-col justify-between rounded-2xl p-3.5 text-white"
              style={{
                background:
                  "linear-gradient(145deg, #f0c35a 0%, #f59e3b 48%, #ff8a4c 100%)",
              }}
            >
              <p className="text-[11px] text-white/75">Protein</p>
              <p className="font-display text-xl font-semibold tabular-nums">
                96g
              </p>
            </div>
          </div>
        </div>
      </div>

      <FloatPanel className="right-[-4%] top-[20%] w-[9.5rem] sm:right-[-2%] sm:w-[10.5rem]" delay={0.3}>
        <div className="rounded-2xl bg-kenoo-ink px-4 py-4 text-white shadow-[0_20px_48px_-16px_rgba(17,17,17,0.55)]">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
            Daily goal
          </p>
          <div className="relative mx-auto mt-3 flex size-[4.75rem] items-center justify-center">
            <svg viewBox="0 0 80 80" className="absolute inset-0" aria-hidden>
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="7"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke={accent}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray="201"
                strokeDashoffset="55"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <p className="font-display text-lg font-semibold tabular-nums">
              72%
            </p>
          </div>
          <p className="mt-2 text-center text-[11px] text-white/60">
            of 10,000 steps
          </p>
        </div>
      </FloatPanel>
    </div>
  );
}

function HealthMealsVisual({ accent }: { accent: string }) {
  const meals = [
    { name: "Oats & berries", kcal: "420 kcal", time: "8:10" },
    { name: "Chicken bowl", kcal: "680 kcal", time: "12:40" },
    { name: "Salmon + greens", kcal: "558 kcal", time: "19:15" },
  ];

  return (
    <div className="relative aspect-[5/4] w-full overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-2xl border border-kenoo-border bg-white shadow-[0_24px_60px_-36px_rgba(17,17,17,0.35)]">
        <div className="flex items-center justify-between border-b border-kenoo-border px-4 py-3">
          <div>
            <p className="font-display text-sm font-semibold text-kenoo-ink">
              Today&apos;s meals
            </p>
            <p className="text-[11px] text-kenoo-muted">1,658 kcal logged</p>
          </div>
          <UtensilsCrossed className="size-4 text-kenoo-muted" strokeWidth={1.5} />
        </div>
        <div className="divide-y divide-kenoo-border">
          {meals.map((meal) => (
            <div
              key={meal.name}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div>
                <p className="text-sm font-medium text-kenoo-ink">{meal.name}</p>
                <p className="text-[11px] text-kenoo-muted">{meal.kcal}</p>
              </div>
              <span className="text-[11px] tabular-nums text-kenoo-muted">
                {meal.time}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-kenoo-border p-3">
          {[
            { label: "Protein", value: "96g" },
            { label: "Carbs", value: "184g" },
            { label: "Fat", value: "58g" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl bg-[#fafafa] px-2.5 py-2 text-center"
            >
              <p className="text-[10px] text-kenoo-muted">{m.label}</p>
              <p className="text-sm font-semibold tabular-nums text-kenoo-ink">
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <FloatPanel className="left-[-2%] top-[18%] w-[11rem] sm:left-[-5%] sm:w-[12rem]" delay={0.25}>
        <div className="rounded-2xl bg-kenoo-ink px-4 py-4 text-white shadow-[0_20px_48px_-16px_rgba(17,17,17,0.55)]">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
            Log meal
          </p>
          <p className="mt-2 font-display text-base font-semibold tracking-[-0.02em]">
            Add lunch
          </p>
          <div className="mt-3 space-y-2">
            {["Search foods", "Quick estimate", "From photo"].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm",
                  i === 0 ? "bg-white/10" : "text-white/70",
                )}
                style={i === 0 ? { color: accent } : undefined}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </FloatPanel>
    </div>
  );
}
