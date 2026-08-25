"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useInView } from "react-intersection-observer";

import { PRICING_TIERS } from "@/lib/pricing";
import { KENOO_PORTAL_URL } from "@/lib/urls";

const ease = [0.22, 1, 0.36, 1] as const;

function TierMark({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path
          d="M4 12a8 8 0 0 1 16 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <circle
        cx="9"
        cy="12"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="15"
        cy="12"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ProductPricingCta() {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-kenoo-border bg-kenoo-canvas"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 50% 120%, rgba(11,110,255,0.12), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.65, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Pricing
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.045em] text-kenoo-ink md:text-5xl">
            Grow without limits.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-kenoo-muted md:text-lg">
            Software that scales with you.
          </p>
        </motion.div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {PRICING_TIERS.map((tier, index) => (
            <motion.li
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: 0.55,
                delay: 0.1 + index * 0.08,
                ease,
              }}
              className={
                tier.featured
                  ? "flex flex-col rounded-2xl border border-kenoo-ink bg-kenoo-surface p-6 shadow-[0_20px_50px_-36px_rgba(17,17,17,0.45)] md:p-7"
                  : "flex flex-col rounded-2xl border border-kenoo-border bg-kenoo-surface p-6 md:p-7"
              }
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kenoo-accent/10 text-kenoo-accent">
                <TierMark index={index} />
              </div>

              <div className="mt-5 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-kenoo-ink">
                  {tier.name}
                </h3>
                {tier.featured ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-kenoo-accent">
                    Popular
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-kenoo-muted">
                {tier.blurb}
              </p>

              <p className="mt-5 font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink">
                {tier.price.startsWith("$") ? (
                  <>
                    <span className="text-sm font-normal text-kenoo-muted">
                      Starts at{" "}
                    </span>
                    {tier.price}
                    <span className="text-base font-normal text-kenoo-muted">
                      /mo
                    </span>
                  </>
                ) : (
                  tier.price
                )}
              </p>

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-kenoo-ink"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-kenoo-muted"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.55, delay: 0.35, ease }}
          className="mt-12 flex flex-col items-center gap-6"
        >
          <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
            <a
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-kenoo-ink px-6 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              Book a demo
            </a>
            <a
              href={KENOO_PORTAL_URL}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-kenoo-border bg-white px-6 text-sm font-medium text-kenoo-ink transition-colors hover:bg-kenoo-subtle"
            >
              Get started
            </a>
          </div>
          <p className="max-w-lg text-center text-xs leading-relaxed text-kenoo-muted">
            Prices shown are starting monthly rates. Seat limits and suite access
            vary by plan.{" "}
            <a
              href="/pricing"
              className="underline decoration-kenoo-border underline-offset-2 transition-colors hover:text-kenoo-ink hover:decoration-kenoo-ink"
            >
              See full pricing details
            </a>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}
