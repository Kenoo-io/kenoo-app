"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ProductMock } from "@/components/kenoo/product-mock";
import { KENOO_PORTAL_URL } from "@/lib/urls";

const chips = ["AdPilot", "CRM", "Ledger", "Health", "AI"];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 md:pt-[4.25rem]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -8%, rgba(11,110,255,0.16), transparent 58%), radial-gradient(ellipse 40% 35% at 92% 18%, rgba(17,17,17,0.04), transparent 50%), linear-gradient(180deg, #f7f8fa 0%, #ffffff 48%, #fcfcfc 100%)",
        }}
      />
      <div aria-hidden className="kenoo-hero-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-4 pt-16 md:px-8 md:pb-6 md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-kenoo-border/80 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-kenoo-muted shadow-[0_1px_2px_rgba(17,17,17,0.04)] backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-kenoo-accent" />
            AI-native business OS
          </p>
          <h1 className="mt-6 font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.05em] text-kenoo-ink sm:text-5xl md:text-[4.15rem]">
            Run the company
            <br />
            from one workspace.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-kenoo-muted md:text-lg">
            Kenoo is the operating system for ads, relationships, money, and
            health. Built for operators who want real depth without the clutter.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={KENOO_PORTAL_URL}
              className="inline-flex h-12 w-full min-w-[11rem] items-center justify-center rounded-full bg-kenoo-ink px-6 text-sm font-medium text-white shadow-[0_12px_32px_-12px_rgba(17,17,17,0.55)] transition-colors hover:bg-black sm:w-auto"
            >
              Get started
            </a>
            <Link
              href="/product"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium text-kenoo-muted transition-colors hover:text-kenoo-ink"
            >
              See the product
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-kenoo-border bg-white/70 px-3 py-1 text-xs font-medium text-kenoo-muted"
              >
                {chip}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <ProductMock />
    </section>
  );
}
