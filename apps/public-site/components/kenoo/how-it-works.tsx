"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const steps = [
  {
    n: "01",
    title: "Sign in once",
    body: "One workspace, one identity. Open AdPilot, CRM, Health, and the rest of the suite without hopping between tools.",
  },
  {
    n: "02",
    title: "Connect the work",
    body: "Link ad accounts, relationships, invoices, and the calendar. Context stays attached to the people and deals that matter.",
  },
  {
    n: "03",
    title: "Operate in the open",
    body: "Status, ownership, and spend stay visible. AI helps sort the day — it does not hide what changed.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function HowItWorks() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section ref={ref} className="border-t border-kenoo-border bg-kenoo-canvas">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.65, ease }}
          className="max-w-2xl"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            How it works
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-[2.75rem]">
            Set up fast. Stay in control.
          </h2>
        </motion.div>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-kenoo-border bg-kenoo-border md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.li
              key={step.n}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.55, delay: 0.08 + index * 0.08, ease }}
              className="bg-kenoo-surface p-7 md:p-8"
            >
              <span className="font-mono text-xs text-kenoo-accent">{step.n}</span>
              <h3 className="mt-4 font-display text-xl font-semibold tracking-[-0.03em] text-kenoo-ink">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-kenoo-muted">
                {step.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
