"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { ChromeFrame } from "@/components/kenoo/chrome-frame";
import {
  DashboardPreview,
  type DashboardPreviewSlug,
} from "@/components/kenoo/dashboard-preview";
import { FEATURED_PRODUCTS } from "@/lib/featured-products";
import { cn } from "@/lib/utils";

const SLUGS = FEATURED_PRODUCTS.map((p) => p.slug) as DashboardPreviewSlug[];

const ease = [0.22, 1, 0.36, 1] as const;

const pillSpring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.7,
};

const MARQUEE: Record<DashboardPreviewSlug, string[]> = {
  adpilot: [
    "Meta Ads",
    "Google Ads",
    "Campaigns",
    "Creatives",
    "Spend",
    "Budgets",
    "Automation",
    "Insights",
  ],
  crm: [
    "People",
    "Companies",
    "Pipeline",
    "Deals",
    "Sequences",
    "Pitches",
    "Outreach",
    "Calendar",
  ],
  health: [
    "Nutrition",
    "Meals",
    "Activities",
    "Goals",
    "Calories",
    "Steps",
    "Apple Health",
    "Progress",
  ],
};

const marqueeVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 40,
    filter: "blur(8px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -36,
    filter: "blur(6px)",
  }),
};

function shortestDirection(from: number, to: number, length: number) {
  let delta = to - from;
  const half = length / 2;
  if (delta > half) delta -= length;
  if (delta < -half) delta += length;
  return delta >= 0 ? 1 : -1;
}

export function ProductMock() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const slug = SLUGS[index] ?? "adpilot";
  const marqueeHalf = [...MARQUEE[slug], ...MARQUEE[slug]];
  const marqueeItems = [...marqueeHalf, ...marqueeHalf];

  function goTo(next: number) {
    if (next === index) return;
    setDirection(shortestDirection(index, next, SLUGS.length));
    setIndex(next);
  }

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % SLUGS.length);
    }, 6400);
    return () => window.clearInterval(timer);
  }, [index, paused]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 0.22, ease }}
      className="relative w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-8 h-40 bg-[radial-gradient(ellipse_at_center,rgba(11,110,255,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mb-5 flex justify-center">
          <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-white/50 bg-white/25 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl">
            {SLUGS.map((item, i) => {
              const selected = i === index;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-pressed={selected}
                  className={cn(
                    "relative inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm transition-colors",
                    selected
                      ? "font-medium text-kenoo-ink"
                      : "text-kenoo-muted hover:text-kenoo-ink",
                  )}
                >
                  {selected ? (
                    <motion.span
                      layoutId="product-preview-pill"
                      className="absolute inset-0 rounded-full border border-white/70 bg-white/80 shadow-[0_4px_16px_-6px_rgba(17,17,17,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md"
                      transition={pillSpring}
                    />
                  ) : null}
                  <span className="relative z-10 font-display tracking-[-0.02em]">
                    {FEATURED_PRODUCTS[i]?.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative [perspective:1400px]">
          <div className="relative origin-bottom md:[transform:rotateX(10deg)]">
            <ChromeFrame className="flex w-full rounded-[1.35rem] shadow-[0_40px_120px_-48px_rgba(17,17,17,0.55)]">
              <div className="w-full overflow-hidden rounded-[19.5px] bg-white">
                <DashboardPreview slug={slug} direction={direction} />
              </div>
            </ChromeFrame>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-6 w-full overflow-hidden pb-8 md:mt-8 md:pb-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-kenoo-canvas to-transparent md:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-kenoo-canvas to-transparent md:w-28" />
        <div className="relative h-6">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={slug}
              custom={direction}
              variants={marqueeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.48, ease }}
              className="absolute inset-x-0"
            >
              <div className="kenoo-product-marquee flex w-max gap-10 pr-10 md:gap-14 md:pr-14">
                {marqueeItems.map((item, i) => (
                  <span
                    key={`${item}-${i}`}
                    className="shrink-0 text-sm font-medium text-kenoo-ink/70"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
