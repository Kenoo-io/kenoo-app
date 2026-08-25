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
    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-12px_rgba(17,17,17,0.22)] backdrop-blur-xl">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent"
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
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-kenoo-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 8% 72%, rgba(11,110,255,0.16), transparent 58%), radial-gradient(ellipse 50% 40% at 92% 28%, rgba(91,184,168,0.16), transparent 55%), radial-gradient(ellipse 40% 30% at 50% 100%, rgba(17,17,17,0.04), transparent 50%), linear-gradient(180deg, #f4f5f4 0%, #fbfbfb 50%, #f1f2f1 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.65, ease }}
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
              Products
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-[2.75rem]">
              Three live apps. Fully polished.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-kenoo-muted md:text-lg">
              Kenoo ships a broader suite over time. These are the apps we
              highlight today — each with a clear job and a path into the live
              product.
            </p>
          </div>
          <Link
            href="/product"
            className="text-sm font-medium text-kenoo-ink underline-offset-4 hover:underline"
          >
            All products
          </Link>
        </motion.div>

        <ul className="mt-14 grid gap-4 md:grid-cols-3">
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
                className="group relative flex h-full flex-col rounded-[1.75rem] p-px shadow-[0_18px_50px_-28px_rgba(17,17,17,0.28)] transition-transform duration-300 hover:-translate-y-1"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0.12) 100%)",
                }}
              >
                <span className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1px)] bg-white/25 p-6 backdrop-blur-2xl md:p-7">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse 80% 50% at 12% -8%, ${product.accentSoft}, transparent 62%)`,
                    }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/55 to-transparent"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-10 top-0 h-px bg-white/90"
                  />
                  <span className="relative flex h-full flex-col">
                    <ProductIcon icon={product.icon} />
                    <h3 className="mt-6 flex items-center gap-1.5 font-display text-xl font-semibold tracking-[-0.03em] text-kenoo-ink">
                      {product.name}
                      <ArrowUpRight className="size-4 opacity-40 transition-opacity group-hover:opacity-100" />
                    </h3>
                    <p className="mt-1 text-sm font-medium text-kenoo-ink/70">
                      {product.tagline}
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-kenoo-muted">
                      {product.description}
                    </p>
                    <span
                      className="mt-6 inline-block text-sm font-medium"
                      style={{ color: product.accent }}
                    >
                      Learn more
                    </span>
                  </span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
