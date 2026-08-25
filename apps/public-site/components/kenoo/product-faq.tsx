"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import type { FeaturedProduct, FeaturedProductFaq } from "@/lib/featured-products";

type ProductFaqProps = {
  product: FeaturedProduct;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function ProductFaq({ product }: ProductFaqProps) {
  return (
    <section className="border-t border-kenoo-border bg-kenoo-surface">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-4xl">
            Questions about {product.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-kenoo-muted">
            Straight answers about how {product.name} works inside Kenoo.
          </p>
        </div>

        <div className="mt-12 border-t border-kenoo-border">
          {product.faq.map((item) => (
            <FaqItem key={item.question} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ item }: { item: FeaturedProductFaq }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const buttonId = useId();

  const duration = reduceMotion ? 0 : 0.4;

  return (
    <div className="border-b border-kenoo-border">
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-start justify-between gap-6 py-5 text-left outline-none transition-colors hover:text-kenoo-accent focus-visible:ring-2 focus-visible:ring-kenoo-accent/30 focus-visible:ring-offset-2"
      >
        <span className="font-display text-lg font-semibold tracking-[-0.02em] text-kenoo-ink md:text-xl">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration, ease }}
          className="mt-1 inline-flex shrink-0 text-kenoo-muted"
        >
          <ChevronDown className="size-5" aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration, ease },
              opacity: { duration: duration * 0.75, ease },
            }}
            className="overflow-hidden"
          >
            <p className="max-w-3xl pb-6 text-base leading-relaxed text-kenoo-muted">
              {item.answer}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
