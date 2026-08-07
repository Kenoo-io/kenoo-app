"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useInView } from "react-intersection-observer";

import { FEATURED_PRODUCTS } from "@/lib/featured-products";

const ease = [0.22, 1, 0.36, 1] as const;

function ProductIcon({ icon }: { icon: string }) {
  return (
    <div className="relative mb-6 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white to-kenoo-subtle shadow-[0_2px_6px_-2px_rgba(0,0,0,0.12)]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent"
      />
      <Image
        src={icon}
        alt=""
        width={44}
        height={44}
        className="relative object-contain"
      />
    </div>
  );
}

export function FeaturedApps() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section
      ref={ref}
      className="border-t border-kenoo-border bg-kenoo-canvas"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.65, ease }}
          className="max-w-2xl"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Products
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-4xl">
            Three apps, fully polished.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-kenoo-muted md:text-lg">
            Kenoo ships a broader suite over time. These are the apps we
            highlight today: each with a clear job, a dedicated page, and a path
            into the live product.
          </p>
        </motion.div>

        <ul className="mt-14 grid gap-2 md:grid-cols-3">
          {FEATURED_PRODUCTS.map((product, index) => (
            <motion.li
              key={product.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={
                inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{
                duration: 0.55,
                delay: 0.08 + index * 0.08,
                ease,
              }}
            >
              <Link
                href={`/product/${product.slug}`}
                className="group flex h-full flex-col rounded-2xl px-5 py-6 transition-colors hover:bg-kenoo-subtle md:px-6 md:py-7"
              >
                <ProductIcon icon={product.icon} />
                <h3 className="flex items-center gap-1.5 font-display text-xl font-semibold tracking-[-0.03em] text-kenoo-ink">
                  {product.name}
                  <ArrowUpRight className="size-4 opacity-40 transition-opacity group-hover:opacity-100" />
                </h3>
                <p className="mt-1 text-sm font-medium text-kenoo-ink/70">
                  {product.tagline}
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-kenoo-muted">
                  {product.description}
                </p>
                <span className="mt-6 text-sm font-medium text-kenoo-accent transition-colors group-hover:text-kenoo-accent-hover">
                  Learn more
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
