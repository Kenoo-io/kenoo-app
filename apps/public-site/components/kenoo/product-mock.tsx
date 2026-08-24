"use client";

import { motion } from "framer-motion";

import { ChromeFrame } from "@/components/kenoo/chrome-frame";

const nav = [
  { label: "Home", active: false },
  { label: "CRM", active: true },
  { label: "AdPilot", active: false },
  { label: "Projects", active: false },
  { label: "Ledger", active: false },
  { label: "Health", active: false },
];

const pipeline = [
  { name: "Northline Studio", stage: "Proposal", value: "$48k", tone: "bg-kenoo-accent" },
  { name: "Harbor Collective", stage: "Negotiation", value: "$22k", tone: "bg-amber-400" },
  { name: "Veld Digital", stage: "Won", value: "$61k", tone: "bg-emerald-500" },
  { name: "Atlas Retail", stage: "Qualified", value: "$19k", tone: "bg-kenoo-subtle" },
];

const tasks = [
  { title: "Send revised SOW", meta: "Today · Maya", done: false },
  { title: "Invoice #1042", meta: "Tomorrow · Finance", done: false },
  { title: "Kickoff: Veld", meta: "Thu · Projects", done: false },
  { title: "Budget review · Meta", meta: "Fri · AdPilot", done: true },
];

const bars = [42, 58, 51, 72, 64, 88, 79];

export function ProductMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-8 h-40 bg-[radial-gradient(ellipse_at_center,rgba(11,110,255,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="relative [perspective:1400px]">
          <div className="relative origin-bottom md:[transform:rotateX(10deg)]">
            <ChromeFrame className="flex w-full rounded-[1.35rem] shadow-[0_40px_120px_-48px_rgba(17,17,17,0.55)]">
              <div className="overflow-hidden rounded-[19.5px] bg-kenoo-white">
                <div className="flex items-center gap-2 border-b border-kenoo-border bg-[#f7f7f6] px-4 py-3">
                  <span className="size-2.5 rounded-full bg-[#e8e8e8]" />
                  <span className="size-2.5 rounded-full bg-[#e8e8e8]" />
                  <span className="size-2.5 rounded-full bg-[#e8e8e8]" />
                  <span className="ml-3 rounded-md bg-white px-2.5 py-1 font-mono text-[11px] tracking-wide text-kenoo-muted ring-1 ring-kenoo-border">
                    kenoo.io / workspace
                  </span>
                  <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-700 sm:inline-flex">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>

                <div className="grid min-h-[300px] md:min-h-[420px] md:grid-cols-[212px_1fr]">
                  <aside className="hidden border-r border-kenoo-border bg-[#fafafa] p-4 md:block">
                    <p className="px-2 font-display text-sm font-semibold tracking-[-0.03em]">
                      Kenoo
                    </p>
                    <ul className="mt-6 space-y-0.5">
                      {nav.map((item) => (
                        <li
                          key={item.label}
                          className={
                            item.active
                              ? "rounded-lg bg-white px-3 py-2 text-sm font-medium text-kenoo-ink shadow-[0_1px_2px_rgba(17,17,17,0.06)] ring-1 ring-kenoo-border"
                              : "rounded-lg px-3 py-2 text-sm text-kenoo-muted"
                          }
                        >
                          {item.label}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 rounded-xl bg-kenoo-ink px-3 py-3 text-white">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/50">
                        Wallet
                      </p>
                      <p className="mt-1 font-display text-lg font-semibold tracking-[-0.03em]">
                        $2,480
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/55">
                        Credits ready
                      </p>
                    </div>
                  </aside>

                  <div className="grid gap-4 p-4 sm:grid-cols-5 md:p-5">
                    <section className="rounded-2xl border border-kenoo-border bg-kenoo-surface p-4 sm:col-span-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-kenoo-ink">
                            Pipeline
                          </h3>
                          <p className="mt-0.5 text-xs text-kenoo-muted">
                            Open deals · this week
                          </p>
                        </div>
                        <p className="font-display text-lg font-semibold tracking-[-0.03em] text-kenoo-ink">
                          $150k
                        </p>
                      </div>
                      <div className="mt-4 flex h-16 items-end gap-1.5">
                        {bars.map((h, i) => (
                          <span
                            key={i}
                            className="flex-1 rounded-t-sm bg-kenoo-accent/80"
                            style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }}
                          />
                        ))}
                      </div>
                      <ul className="mt-4 space-y-2.5">
                        {pipeline.map((row) => (
                          <li
                            key={row.name}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`size-1.5 shrink-0 rounded-full ${row.tone}`}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm text-kenoo-ink">
                                  {row.name}
                                </p>
                                <p className="text-xs text-kenoo-muted">
                                  {row.stage}
                                </p>
                              </div>
                            </div>
                            <p className="shrink-0 font-mono text-xs text-kenoo-ink">
                              {row.value}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="flex flex-col rounded-2xl border border-kenoo-border bg-kenoo-surface p-4 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-kenoo-ink">
                          Today
                        </h3>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-kenoo-accent">
                          AI sorted
                        </span>
                      </div>
                      <ul className="mt-4 flex-1 space-y-2">
                        {tasks.map((task) => (
                          <li
                            key={task.title}
                            className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-kenoo-border/80"
                          >
                            <p
                              className={
                                task.done
                                  ? "text-sm text-kenoo-muted line-through"
                                  : "text-sm text-kenoo-ink"
                              }
                            >
                              {task.title}
                            </p>
                            <p className="mt-0.5 text-xs text-kenoo-muted">
                              {task.meta}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>
              </div>
            </ChromeFrame>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-kenoo-canvas via-kenoo-canvas/85 to-transparent md:h-36"
      />
    </motion.div>
  );
}
