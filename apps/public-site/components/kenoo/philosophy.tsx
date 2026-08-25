"use client";

import { motion } from "framer-motion";
import { Layers, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useInView } from "react-intersection-observer";

const pillars = [
  {
    icon: Layers,
    title: "One workspace",
    body: "Ads, CRM, finance, and health share a single identity. No more stitching five logins into a company.",
  },
  {
    icon: Workflow,
    title: "Depth without clutter",
    body: "Every screen is built for operators: clear records, readable stages, and actions that stay obvious.",
  },
  {
    icon: Sparkles,
    title: "AI that stays visible",
    body: "Assist where it helps: sorting the day, drafting outreach, previewing budget changes, without hiding ownership.",
  },
  {
    icon: ShieldCheck,
    title: "Ready to grow",
    body: "Start with the apps you need today. The rest of the suite is already designed to sit beside them.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Philosophy() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section ref={ref} className="border-t border-kenoo-border bg-kenoo-surface">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.65, ease }}
          className="max-w-2xl"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Philosophy
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-[2.75rem]">
            Keep the depth.
            <br />
            Remove the friction.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-kenoo-muted md:text-lg">
            Modern teams need real capability from their software. Kenoo gives
            you a full suite for day-to-day operations, designed to stay clear
            and easy to use.
          </p>
        </motion.div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar, index) => (
            <motion.li
              key={pillar.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.07, ease }}
              className="rounded-[1.5rem] border border-kenoo-border bg-kenoo-canvas p-6 md:p-7"
            >
              <pillar.icon className="size-5 text-kenoo-accent" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-lg font-semibold tracking-[-0.03em] text-kenoo-ink">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-kenoo-muted">
                {pillar.body}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
