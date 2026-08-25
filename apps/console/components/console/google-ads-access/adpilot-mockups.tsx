import {
  CircleDollarSign,
  LayoutDashboard,
  MousePointerClick,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const PANEL =
  "rounded-[22px] border border-neutral-200/90 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]";

function BrowserChrome({
  url,
  title,
  children,
}: {
  url: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="break-inside-avoid">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-[#f7f7f8] shadow-sm">
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <div className="min-w-0 flex-1 rounded-full bg-neutral-100 px-3 py-1 text-center text-[11px] text-neutral-500">
            {url}
          </div>
        </div>
        {children}
      </div>
      <figcaption className="mt-2 text-xs leading-5 text-neutral-500">
        {title}
      </figcaption>
    </figure>
  );
}

function SideRail({ active }: { active: string }) {
  const items = [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Campaigns", icon: Target },
    { label: "Audiences", icon: Users },
    { label: "Presets", icon: SlidersHorizontal },
    { label: "Settings", icon: Settings },
  ] as const;

  return (
    <aside className="hidden w-[3.25rem] shrink-0 flex-col items-center gap-1 py-4 sm:flex">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.label === active;
        return (
          <span
            key={item.label}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              isActive
                ? "bg-white text-neutral-900 shadow-[0_0_0_1px_rgba(110,173,192,0.45),0_0_10px_rgba(110,173,192,0.25)]"
                : "text-neutral-400"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.6} />
          </span>
        );
      })}
    </aside>
  );
}

export function AdPilotDashboardMockup() {
  const stats = [
    { label: "Ad spend", value: "$24,812", change: "+12%", icon: CircleDollarSign, color: "#6eadc0" },
    { label: "Impressions", value: "1.24M", change: "+8%", icon: TrendingUp, color: "#0066b2" },
    { label: "Clicks", value: "48.4k", change: "+6%", icon: MousePointerClick, color: "#00d1c1" },
    { label: "ROAS", value: "4.2x", change: "+0.3", icon: TrendingUp, color: "#10b981" },
    { label: "Purchases", value: "186", change: "+18%", icon: ShoppingBag, color: "#f59e0b" },
    { label: "Purchase value", value: "$104k", change: "+14%", icon: CircleDollarSign, color: "#7a04eb" },
  ];

  return (
    <BrowserChrome
      url="https://adpilot.kenoo.io"
      title="AdPilot dashboard — performance reporting by time period (Google Ads + Meta Ads)."
    >
      <div className="flex bg-[#fcfcfc]">
        <SideRail active="Dashboard" />
        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                AdPilot
              </p>
              <h3 className="text-base font-semibold tracking-tight text-neutral-950">
                Performance
              </h3>
            </div>
            <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              Last 30 days
            </span>
          </div>
          <div className={`mt-3 overflow-hidden ${PANEL}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`flex items-center gap-2.5 px-3 py-3 ${
                      index < 4 ? "border-b border-neutral-100" : ""
                    } ${index % 2 === 0 ? "sm:border-r" : ""} ${
                      index % 3 !== 2 ? "sm:border-r sm:border-neutral-100" : ""
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-50"
                      style={{ color: stat.color }}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] text-neutral-500">
                        {stat.label}
                      </p>
                      <p className="text-sm font-semibold tabular-nums tracking-tight">
                        {stat.value}{" "}
                        <span className="text-[10px] font-medium text-emerald-600">
                          {stat.change}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`mt-3 px-4 py-3 ${PANEL}`}>
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
              Spend trend
            </p>
            <svg viewBox="0 0 420 90" className="mt-2 h-16 w-full" aria-hidden>
              <path
                d="M0 70 C40 66, 70 54, 100 58 C140 64, 170 36, 210 40 C250 44, 280 22, 320 26 C360 30, 390 16, 420 20 L420 90 L0 90 Z"
                fill="rgba(110,173,192,0.22)"
              />
              <path
                d="M0 70 C40 66, 70 54, 100 58 C140 64, 170 36, 210 40 C250 44, 280 22, 320 26 C360 30, 390 16, 420 20"
                fill="none"
                stroke="#6eadc0"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M0 78 C50 72, 90 82, 140 68 C190 54, 240 74, 300 60 C360 48, 390 56, 420 44"
                fill="none"
                stroke="#e2f85c"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

export function AdPilotCampaignsMockup() {
  const rows = [
    ["Search — Kenoo suite", "Enabled", "Traffic", "$84.00", "4.8x"],
    ["PMax — Product launch", "Enabled", "Sales", "$120.00", "3.9x"],
    ["Demand gen — CRM", "Paused", "Traffic", "$45.00", "2.1x"],
  ];

  return (
    <BrowserChrome
      url="https://adpilot.kenoo.io/campaigns"
      title="AdPilot campaigns — Google Ads campaigns, budgets, and performance synced into Kenoo."
    >
      <div className="flex bg-[#fcfcfc]">
        <SideRail active="Campaigns" />
        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold tracking-tight">Campaigns</h3>
            <div className="flex gap-1 rounded-full border border-neutral-200 bg-white p-0.5 text-[10px]">
              <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-white">
                Campaigns
              </span>
              <span className="px-2.5 py-1 text-neutral-500">Ad groups</span>
              <span className="px-2.5 py-1 text-neutral-500">Ads</span>
            </div>
          </div>
          <div className={`mt-3 overflow-hidden ${PANEL}`}>
            <table className="w-full text-left text-[11px]">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-400">
                <tr>
                  {["Campaign", "Status", "Objective", "Daily budget", "ROAS"].map(
                    (heading) => (
                      <th key={heading} className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[0]} className="border-t border-neutral-100">
                    {row.map((cell, index) => (
                      <td key={cell} className="px-3 py-2.5 text-neutral-700">
                        {index === 1 ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                              cell === "Enabled"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {cell}
                          </span>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

export function AdPilotConnectionsMockup() {
  return (
    <BrowserChrome
      url="https://adpilot.kenoo.io/settings"
      title="AdPilot settings — OAuth connection to Google Ads for the signed-in Kenoo workspace."
    >
      <div className="flex bg-[#fcfcfc]">
        <SideRail active="Settings" />
        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
          <h3 className="text-base font-semibold tracking-tight">Connections</h3>
          <p className="mt-1 text-[11px] leading-5 text-neutral-500">
            Connect ad accounts you own. Data stays in this Kenoo workspace.
          </p>
          <div className={`mt-3 divide-y divide-neutral-100 ${PANEL}`}>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">Google Ads</p>
                <p className="text-[11px] text-neutral-500">
                  Kenoo · 123-456-7890 · Connected
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                Synced
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">Meta Ads</p>
                <p className="text-[11px] text-neutral-500">
                  Optional second channel in the same dashboard
                </p>
              </div>
              <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-[10px] text-neutral-500">
                Connect
              </span>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

export function AdPilotAutomationMockup() {
  return (
    <BrowserChrome
      url="https://adpilot.kenoo.io/campaigns/search-kenoo"
      title="AdPilot campaign detail — reporting plus spend guardrails. Operators preview rules before they apply."
    >
      <div className="flex bg-[#fcfcfc]">
        <SideRail active="Campaigns" />
        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400">
            Campaigns / Search — Kenoo suite
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">
            Guardrails
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className={`px-4 py-3 ${PANEL}`}>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                Preset
              </p>
              <p className="mt-1 text-sm font-medium">Balanced ROAS</p>
              <p className="text-[11px] text-neutral-500">
                Optimize for ROAS · Default
              </p>
            </div>
            <div className={`grid grid-cols-2 gap-2`}>
              {[
                ["Max increase", "15%"],
                ["Max decrease", "12%"],
                ["Cooldown", "24 hours"],
                ["If breached", "Alert"],
              ].map(([label, value]) => (
                <div key={label} className={`px-3 py-2.5 ${PANEL}`}>
                  <p className="text-[10px] text-neutral-500">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}
