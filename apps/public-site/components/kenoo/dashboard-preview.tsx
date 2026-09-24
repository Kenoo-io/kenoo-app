"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CalendarDays,
  ChevronLeft,
  CircleDollarSign,
  Handshake,
  LayoutDashboard,
  ListTodo,
  Mail,
  Megaphone,
  MousePointerClick,
  Plus,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Target,
  TrendingUp,
  UserRound,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type DashboardPreviewSlug = "adpilot" | "crm" | "health" | "projects";

const HOST: Record<DashboardPreviewSlug, string> = {
  adpilot: "adpilot.kenoo.io",
  crm: "crm.kenoo.io",
  health: "health.kenoo.io",
  projects: "projects.kenoo.io",
};

const ADPILOT_NAV: { icon: LucideIcon; label: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Target, label: "Campaigns" },
  { icon: Users, label: "Audiences" },
  { icon: SlidersHorizontal, label: "Presets" },
  { icon: Settings, label: "Settings" },
];

const CRM_NAV: { icon: LucideIcon; label: string }[] = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: Users, label: "People" },
  { icon: Building2, label: "Companies" },
  { icon: Handshake, label: "Deals" },
  { icon: Megaphone, label: "Pitches" },
  { icon: Mail, label: "Sequences" },
];

const HEALTH_NAV: { icon: LucideIcon; label: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: UtensilsCrossed, label: "Meals" },
  { icon: Activity, label: "Activities" },
  { icon: Target, label: "Goals" },
  { icon: Settings, label: "Settings" },
];

const PROJECTS_NAV: { icon: LucideIcon; label: string }[] = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: ListTodo, label: "Tasks" },
  { icon: CalendarDays, label: "Timeline" },
  { icon: Users, label: "Team" },
  { icon: Settings, label: "Settings" },
];

const NAV: Record<DashboardPreviewSlug, { icon: LucideIcon; label: string }[]> = {
  adpilot: ADPILOT_NAV,
  crm: CRM_NAV,
  health: HEALTH_NAV,
  projects: PROJECTS_NAV,
};

const GLASS =
  "bg-white/80 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl";

const PANEL =
  "rounded-[2rem] border border-black/[0.04] bg-white shadow-[0_10px_32px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]";

const sceneEase = [0.22, 1, 0.36, 1] as const;

const sceneVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 36,
    filter: "blur(10px)",
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    scale: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -28,
    filter: "blur(8px)",
    scale: 0.99,
  }),
};

type DashboardPreviewProps = {
  slug: DashboardPreviewSlug;
  /** Cropped card thumbnail vs full app window. */
  variant?: "window" | "card";
  /** 1 = next, -1 = previous. Used for directional scene motion. */
  direction?: number;
  className?: string;
};

export function DashboardPreview({
  slug,
  variant = "window",
  direction = 1,
  className,
}: DashboardPreviewProps) {
  if (variant === "card") {
    return (
      <div
        aria-hidden
        className={cn(
          "pointer-events-none relative overflow-hidden bg-[#fafafa]",
          className,
        )}
      >
        <DashboardScene slug={slug} compact />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none overflow-hidden bg-white", className)}
    >
      <div className="flex items-center gap-2 border-b border-neutral-200/80 bg-[#f7f7f6] px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#e8e8e8]" />
        <span className="size-2.5 rounded-full bg-[#e8e8e8]" />
        <span className="size-2.5 rounded-full bg-[#e8e8e8]" />
        <span className="relative ml-3 min-w-[9.5rem] overflow-hidden rounded-md bg-white px-2.5 py-1 ring-1 ring-neutral-200">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.span
              key={slug}
              custom={direction}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: sceneEase }}
              className="block font-mono text-[11px] tracking-wide text-neutral-500"
            >
              {HOST[slug]}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
      <div className="relative min-h-[300px] overflow-hidden bg-white md:min-h-[440px]">
        <AppRail items={NAV[slug]} />
        <AnimatePresence mode="sync" initial={false} custom={direction}>
          <motion.div
            key={slug}
            custom={direction}
            variants={sceneVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.55, ease: sceneEase }}
            className="absolute inset-0 pl-[4.35rem] pr-3 pt-3 pb-3 md:pl-[4.75rem] md:pr-4 md:pt-4"
          >
            <DashboardScene slug={slug} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AppRail({ items }: { items: { icon: LucideIcon; label: string }[] }) {
  return (
    <div className="absolute left-0 top-0 z-10 hidden h-full items-center pl-2.5 md:flex">
      <nav className="flex w-14 flex-col items-stretch gap-1 rounded-[2rem] bg-white/85 p-2 shadow-[0_10px_32px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-md">
        <span className="flex h-10 w-full items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <ChevronLeft className="h-[18px] w-[18px] rotate-180 stroke-[1.5]" />
          </span>
        </span>
        <span className="my-1 ml-2 h-px w-6 bg-neutral-200/90" />
        {items.slice(0, 5).map((item, index) => {
          const Icon = item.icon;
          const active = index === 0;
          return (
            <span
              key={item.label}
              className={cn(
                "flex h-10 w-full items-center justify-start rounded-full",
                active && "bg-neutral-100/90",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  active
                    ? "bg-white text-neutral-800 shadow-[0_4px_14px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-black/[0.04]"
                    : "bg-neutral-100 text-neutral-500",
                )}
              >
                <Icon className="h-[18px] w-[18px] stroke-[1.5]" />
              </span>
            </span>
          );
        })}
      </nav>
    </div>
  );
}

function DashboardScene({
  slug,
  compact,
}: {
  slug: DashboardPreviewSlug;
  compact?: boolean;
}) {
  if (slug === "crm") return <CrmScene compact={compact} />;
  if (slug === "health") return <HealthScene compact={compact} />;
  if (slug === "projects") return <ProjectsScene compact={compact} />;
  return <AdPilotScene compact={compact} />;
}

function ProjectsScene({ compact }: { compact?: boolean }) {
  const todayTasks = [
    {
      title: "Kenoo CRM Outreach Adjustments",
      project: "WALLS Team Projects",
      members: ["C", "A", "J"],
      status: "In Progress",
      tone: "#ff6b2c",
    },
    {
      title: "Get Parita Access to Projects System",
      project: "Email tasks",
      members: ["C"],
      status: "To Do",
      tone: "#6eadc0",
    },
    {
      title: "Contact Vercel Support",
      project: "Email tasks",
      members: ["C"],
      status: "To Do",
      tone: "#6eadc0",
    },
  ];

  const members = [
    { initials: "JL", name: "Jordan Lee", tasks: 6 },
    { initials: "AP", name: "Avery Park", tasks: 4 },
  ];

  return (
    <div className={cn("space-y-3", compact ? "p-3" : "p-1.5")}>
      {compact ? null : (
        <div className={cn("flex items-center justify-between rounded-[22px] px-4 py-3.5", GLASS)}>
          <div>
            <p className="text-base font-semibold tracking-tight text-neutral-900">WALLS Entertainment Hub</p>
            <p className="mt-0.5 text-[9px] font-light text-neutral-400">Organization workspace <span className="mx-1.5 text-neutral-300">|</span> <span className="font-mono">ID 54B2EB74AD</span></p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden -space-x-1.5 sm:flex">
              {["JL", "AP", "MK"].map((initials, index) => (
                <span key={initials} className={cn("flex size-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-semibold", index === 0 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500")}>{initials}</span>
              ))}
            </div>
            <span className="hidden h-7 items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 text-[9px] font-medium text-neutral-600 sm:inline-flex"><Plus className="size-3" /> New Task</span>
            <span className="inline-flex h-7 items-center gap-1 rounded-full bg-black px-2.5 text-[9px] font-medium text-white"><Plus className="size-3" /> New Project</span>
          </div>
        </div>
      )}
      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-[1.48fr_0.98fr]")}>
        <div className={cn("rounded-[22px] p-3.5", GLASS)}>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold tracking-tight text-neutral-900">Today Task</p>
            <span className="text-[9px] font-medium text-neutral-400">See All&nbsp; ›</span>
          </div>
          <div className={cn("mt-3 grid gap-2", compact ? "grid-cols-1" : "grid-cols-3")}>
            {todayTasks.map((task) => (
              <div key={task.title} className="flex min-w-0 flex-col rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]" style={{ backgroundImage: "radial-gradient(circle at 8% 8%, rgba(110,173,192,0.20), transparent 42%), radial-gradient(circle at 92% 92%, rgba(255,107,44,0.06), transparent 42%)" }}>
                <p className="line-clamp-3 text-[11px] font-normal leading-snug tracking-tight text-neutral-900 md:text-xs">{task.title}</p>
                <p className="mt-1 flex items-center gap-1.5 truncate text-[8px] font-light text-neutral-600/80"><span className="size-1.5 shrink-0 rounded-full bg-[#6eadc0]" />{task.project}</p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                  <div className="flex -space-x-1.5">{task.members.map((member, index) => <span key={`${task.title}-${member}`} className={cn("flex size-5 items-center justify-center rounded-full border-2 border-white/70 text-[7px] font-semibold", index === 0 ? "bg-neutral-900 text-white" : index === 1 ? "bg-amber-100 text-amber-800" : "bg-neutral-200 text-neutral-600")}>{member}</span>)}</div>
                  <span className="text-right text-[8px] font-medium" style={{ color: task.tone }}>{task.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={cn("rounded-[22px] p-3.5", GLASS)}>
          <div className="flex items-center justify-between"><p className="text-[12px] font-semibold tracking-tight text-neutral-900">Task Status</p><span className="text-[8px] text-neutral-400">Total 173</span></div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="space-y-2 text-[9px] text-neutral-500"><p className="whitespace-nowrap"><span className="mr-2 inline-block size-2 rounded-full bg-[#e4fb4c]" />Done <b className="ml-1 text-neutral-800">97%</b></p><p className="whitespace-nowrap"><span className="mr-2 inline-block size-2 rounded-full bg-[#ff6b2c]" />In Progress <b className="ml-1 text-neutral-800">0%</b></p><p className="whitespace-nowrap"><span className="mr-2 inline-block size-2 rounded-full bg-[#6eadc0]" />Backlog <b className="ml-1 text-neutral-800">3%</b></p></div>
            <div className="relative flex size-[5.5rem] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#e4fb4c_0_72%,#ff6b2c_72%_73%,#6eadc0_73%_76%,#eef1f6_76%_100%)] p-2.5"><div className="flex size-full items-center justify-center rounded-full bg-white"><span className="size-[2.3rem] rounded-full border-[8px] border-[#f0f2f7]" /></div></div>
          </div>
        </div>
      </div>
      {compact ? null : (
        <div className="grid grid-cols-3 gap-3">
          <div className={cn("min-h-[8.5rem] rounded-[22px] p-3.5", GLASS)}>
            <div className="flex items-center justify-between"><p className="text-[12px] font-semibold tracking-tight text-neutral-900">Team Workload</p><span className="text-[9px] font-medium text-neutral-400">See All&nbsp; ›</span></div>
            <div className="mt-3 space-y-2">{members.map((member) => <div key={member.name} className="flex items-center gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[7px] font-semibold text-white">{member.initials}</span><div className="min-w-0"><p className="truncate text-[8px] font-semibold text-neutral-800">{member.name}</p><p className="text-[7px] text-neutral-400">Current workload</p></div><p className="ml-auto whitespace-nowrap text-[8px] text-neutral-400"><b className="text-neutral-800">{member.tasks}</b> open</p></div>)}</div>
          </div>
          <div className={cn("min-h-[8.5rem] rounded-[22px] p-3.5", GLASS)}>
            <div className="flex items-center justify-between"><p className="text-[12px] font-semibold tracking-tight text-neutral-900">Tracker Detail</p><span className="text-[9px] font-medium text-neutral-400">See All&nbsp; ›</span></div>
            <div className="mt-3 flex items-center gap-3 text-[8px] text-neutral-500"><span><i className="mr-1 inline-block size-1.5 rounded-sm bg-[#e4fb4c]" />Done</span><span><i className="mr-1 inline-block size-1.5 rounded-sm bg-[#6eadc0]" />Active</span></div>
            <div className="mt-2 flex h-14 items-end gap-1.5 border-b border-dashed border-neutral-200 px-1">
              {[18, 28, 16, 41, 23, 32, 19].map((height, index) => <span key={index} className="flex-1 rounded-t-md bg-[#e4fb4c]" style={{ height }} />)}
            </div>
            <div className="mt-1 flex justify-between px-1 text-[7px] text-neutral-400"><span>Mon</span><span>Sun</span></div>
          </div>
          <div className={cn("min-h-[8.5rem] rounded-[22px] p-3.5", GLASS)}>
            <div className="flex items-center justify-between"><p className="text-[12px] font-semibold tracking-tight text-neutral-900">Needs Attention</p><span className="text-[9px] font-medium text-neutral-400">See All&nbsp; ›</span></div>
            <div className="mt-3 space-y-2">
              {["Kenoo CRM Outreach Adjustments", "Contact Vercel Support"].map((task, index) => <div key={task} className="flex items-center gap-2 rounded-xl bg-white/75 px-2 py-1.5 shadow-sm"><span className={cn("flex size-5 items-center justify-center rounded-full text-[7px] font-semibold", index === 0 ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-600")}>C</span><div className="min-w-0"><p className="truncate text-[9px] font-semibold text-neutral-700">{task}</p><p className="mt-0.5 text-[7px] uppercase tracking-wide text-neutral-400">To do</p></div><span className="ml-auto text-[7px] text-neutral-400">Sep 9</span></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdPilotScene({ compact }: { compact?: boolean }) {
  const stats: {
    label: string;
    value: string;
    change: string;
    icon: LucideIcon;
    accent: string;
  }[] = [
    {
      label: "Spend",
      value: "$24.8k",
      change: "12%",
      icon: CircleDollarSign,
      accent: "#6eadc0",
    },
    {
      label: "Impressions",
      value: "1.24M",
      change: "8%",
      icon: TrendingUp,
      accent: "#0066b2",
    },
    {
      label: "Clicks",
      value: "48.2k",
      change: "5%",
      icon: MousePointerClick,
      accent: "#00d1c1",
    },
    {
      label: "CTR",
      value: "3.9%",
      change: "0.4",
      icon: TrendingUp,
      accent: "#7a04eb",
    },
    {
      label: "Purchases",
      value: "186",
      change: "18%",
      icon: ShoppingBag,
      accent: "#f59e0b",
    },
    {
      label: "ROAS",
      value: "4.2x",
      change: "0.3",
      icon: CircleDollarSign,
      accent: "#10b981",
    },
  ];

  return (
    <div className={cn("space-y-3", compact && "space-y-2 p-3")}>
      <div className="flex justify-start">
        <span className="inline-flex rounded-full bg-neutral-100 p-1 text-[10px] font-medium text-neutral-600 ring-1 ring-inset ring-black/[0.04]">
          <span className="rounded-full bg-white px-3 py-1 shadow-[0_1px_4px_rgba(15,23,42,0.08)]">
            Last 30 days
          </span>
        </span>
      </div>
      <div className={cn("overflow-hidden rounded-[28px]", GLASS)}>
        <div className="grid grid-cols-2 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 border-neutral-200/80 px-3 py-3 md:px-4 md:py-3.5",
                  "border-b last:border-b-0 even:border-r-0",
                  "border-r sm:border-r sm:[&:nth-child(3n)]:border-r-0",
                  "sm:[&:nth-last-child(-n+3)]:border-b-0",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
                  <Icon
                    className="h-3.5 w-3.5"
                    strokeWidth={1.8}
                    style={{ color: stat.accent }}
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-light text-neutral-500">
                    {stat.label}
                  </p>
                  <p className="flex items-baseline gap-1.5 text-base font-semibold tabular-nums tracking-tight text-neutral-900 md:text-lg">
                    {stat.value}
                    <span className="text-[10px] font-medium text-emerald-600">
                      +{stat.change}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {compact ? null : (
        <div className={cn("rounded-[28px] p-4 md:p-5", GLASS)}>
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
            Performance · Last 30 days
          </p>
          <SpendSpark />
        </div>
      )}
    </div>
  );
}

function SpendSpark() {
  const fillId = useId();
  return (
    <svg viewBox="0 0 560 120" className="mt-3 h-24 w-full md:h-28" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6eadc0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6eadc0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 88 C40 82, 70 70, 100 74 C140 80, 170 48, 210 52 C250 56, 280 30, 320 36 C360 42, 390 22, 430 28 C470 34, 500 18, 560 24 L560 120 L0 120 Z"
        fill={`url(#${fillId})`}
      />
      <path
        d="M0 88 C40 82, 70 70, 100 74 C140 80, 170 48, 210 52 C250 56, 280 30, 320 36 C360 42, 390 22, 430 28 C470 34, 500 18, 560 24"
        fill="none"
        stroke="#0066b2"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M0 96 C50 90, 90 102, 140 86 C190 70, 240 92, 300 78 C360 64, 420 72, 560 58"
        fill="none"
        stroke="#e2f85c"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

function CrmScene({ compact }: { compact?: boolean }) {
  const deals = [
    { name: "Northline retainer", amount: "$48k", date: "August 12", tone: "bg-[#0066b2] text-white" },
    { name: "Harbor Collective", amount: "$22k", date: "August 9", tone: "bg-[#6eadc0] text-white" },
    { name: "Veld kickoff", amount: "$61k", date: "August 4", tone: "bg-black text-white" },
    { name: "Atlas retail", amount: "$19k", date: "July 28", tone: "bg-[#e2f85c] text-neutral-900" },
  ];

  return (
    <div className={cn(compact ? "p-3" : "")}>
      {compact ? null : (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-8 py-1">
          <CrmKpi
            icon={TrendingUp}
            value="$86k"
            line1="Won from 4 Deals"
            line2="This Month"
            badge="+12% week"
            badgeClass="bg-[#e2f85c] text-neutral-900"
          />
          <CrmKpi
            icon={UserRound}
            value="+18"
            line1="New Contacts"
            line2="for Week"
            badge="+3 today"
            badgeClass="bg-[#0066b2] text-white"
          />
        </div>
      )}
      <div className={cn("p-4", PANEL, compact && "p-3")}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-900">
            Interaction History
          </p>
          <p className="text-[10px] font-medium text-neutral-400">View all deals</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {deals.map((deal) => (
            <div
              key={deal.name}
              className={cn(
                "flex min-h-[96px] flex-col justify-between rounded-[22px] p-3",
                deal.tone,
              )}
            >
              <div>
                <p className="text-[10px] font-medium opacity-75">{deal.date}</p>
                <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug">
                  {deal.name}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{deal.amount}</p>
            </div>
          ))}
        </div>
      </div>
      {compact ? null : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className={cn("p-4", PANEL)}>
            <p className="text-xs font-semibold text-neutral-900">Tasks Schedule</p>
            <p className="text-[10px] text-neutral-400">August 2026</p>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span
                  key={i}
                  className="text-center text-[9px] font-medium text-neutral-400"
                >
                  {d}
                </span>
              ))}
              {Array.from({ length: 28 }, (_, i) => {
                const day = i + 1;
                const marked = day === 12 || day === 18 || day === 25;
                return (
                  <span
                    key={day}
                    className={cn(
                      "relative flex h-6 flex-col items-center justify-center rounded-full text-[10px] tabular-nums",
                      day === 25
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-600",
                    )}
                  >
                    {day}
                    {marked && day !== 25 ? (
                      <span className="absolute bottom-0.5 size-1 rounded-full bg-[#0066b2]" />
                    ) : null}
                  </span>
                );
              })}
            </div>
          </div>
          <div className={cn("p-4", PANEL)}>
            <p className="text-xs font-semibold text-neutral-900">Pipeline</p>
            <p className="text-[10px] text-neutral-400">$150k total</p>
            <div className="mt-4 space-y-2">
              {[
                { name: "Proposal", value: "$48k", width: "92%" },
                { name: "Negotiation", value: "$22k", width: "74%" },
                { name: "Qualified", value: "$19k", width: "58%" },
              ].map((row) => (
                <div
                  key={row.name}
                  className="ml-auto rounded-full border border-black/[0.04] bg-white px-4 py-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03]"
                  style={{ width: row.width }}
                >
                  <p className="text-[10px] font-medium text-neutral-500">
                    {row.name}
                  </p>
                  <p className="text-xs font-semibold tabular-nums text-neutral-900">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CrmKpi({
  icon: Icon,
  value,
  line1,
  line2,
  badge,
  badgeClass,
}: {
  icon: LucideIcon;
  value: string;
  line1: string;
  line2: string;
  badge: string;
  badgeClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.04] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03]">
        <Icon className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
      </span>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-semibold tracking-tight tabular-nums text-neutral-900">
            {value}
          </p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              badgeClass,
            )}
          >
            {badge}
          </span>
        </div>
        <p className="text-[11px] leading-snug text-neutral-400">
          {line1}
          <br />
          {line2}
        </p>
      </div>
    </div>
  );
}

type HealthMetricCard = {
  title: string;
  value: string;
  detail: string;
  background: string;
  text: string;
  muted: string;
};

const HEALTH_CORE_CARDS: HealthMetricCard[] = [
  {
    title: "Steps",
    value: "8,420",
    detail: "72% of 10,000 · 3.8 mi",
    background: "linear-gradient(135deg, #6eadc0 0%, #f0a060 48%, #e86b5a 100%)",
    text: "text-white",
    muted: "text-white/75",
  },
  {
    title: "Protein",
    value: "96g",
    detail: "On track · 110g target",
    background: "linear-gradient(145deg, #f0c35a 0%, #f59e3b 48%, #ff8a4c 100%)",
    text: "text-white",
    muted: "text-white/75",
  },
  {
    title: "Carbs",
    value: "184g",
    detail: "Target 210g",
    background: "linear-gradient(145deg, #ff9a5c 0%, #ff7130 55%, #8dcf76 100%)",
    text: "text-white",
    muted: "text-white/75",
  },
  {
    title: "Fat",
    value: "58g",
    detail: "Target 65g",
    background: "linear-gradient(145deg, #c8e86a 0%, #e2f85c 45%, #ceff00 100%)",
    text: "text-neutral-900",
    muted: "text-neutral-700/80",
  },
  {
    title: "Meals logged",
    value: "3",
    detail: "1,658 kcal today",
    background: "linear-gradient(145deg, #d9e2e8 0%, #b7c8d2 50%, #9bb0bd 100%)",
    text: "text-neutral-900",
    muted: "text-neutral-600",
  },
  {
    title: "Active burn",
    value: "1,240",
    detail: "From logged activities",
    background: "linear-gradient(145deg, #4a6b52 0%, #6f8f6a 42%, #9bb58a 100%)",
    text: "text-white",
    muted: "text-white/70",
  },
];

function HealthMetricTile({
  card,
  compact,
}: {
  card: HealthMetricCard;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]",
        compact ? "min-h-[72px] p-2.5" : "min-h-[88px] p-3.5",
      )}
      style={{ background: card.background }}
    >
      <p
        className={cn(
          "font-medium uppercase tracking-[0.16em]",
          compact ? "text-[8px]" : "text-[9px]",
          card.muted,
        )}
      >
        {card.title}
      </p>
      <p
        className={cn(
          "mt-3 font-semibold tracking-tight tabular-nums",
          compact ? "text-lg" : "text-xl md:text-2xl",
          card.text,
        )}
      >
        {card.value}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate font-light",
          compact ? "text-[9px]" : "text-[10px]",
          card.muted,
        )}
      >
        {card.detail}
      </p>
    </div>
  );
}

function HealthScene({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid h-full grid-cols-[1.1fr_1fr] items-center gap-2 p-3">
        <div className="flex items-center justify-center">
          <div className="relative flex size-[9.25rem] items-center justify-center">
            <div className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(255,113,48,0.14),rgba(255,255,255,0)_67%)]" />
            <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden>
              <circle cx="100" cy="100" r="82" fill="none" stroke="#e7e7e5" strokeWidth="13" />
              <circle
                cx="100"
                cy="100"
                r="82"
                fill="none"
                stroke="#ceff00"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 82}`}
                strokeDashoffset={`${2 * Math.PI * 82 * 0.32}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-semibold tracking-tight text-neutral-900">842</p>
              <p className="text-[9px] text-neutral-400">Remaining</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {HEALTH_CORE_CARDS.slice(0, 4).map((card) => (
            <HealthMetricTile key={card.title} card={card} compact />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-3 md:grid-cols-2">
      <div className="hidden items-center justify-center md:flex">
        <div className="relative flex h-[300px] w-[300px] items-center justify-center">
          <div
            className="absolute inset-6 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(206,255,0,0.18) 0%, rgba(255,113,48,0.08) 45%, transparent 70%)",
            }}
          />
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="#e6e6e4"
              strokeWidth="10"
            />
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="#ceff00"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 86}`}
              strokeDashoffset={`${2 * Math.PI * 86 * 0.32}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl font-semibold tracking-tight tabular-nums text-neutral-900">
              842
            </p>
            <p className="text-sm text-neutral-400">Remaining</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 content-center gap-2.5">
        {HEALTH_CORE_CARDS.map((card) => (
          <HealthMetricTile key={card.title} card={card} />
        ))}
      </div>
    </div>
  );
}
