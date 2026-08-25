"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ChromeFrame } from "@/components/kenoo/chrome-frame";
import { DashboardPreview } from "@/components/kenoo/dashboard-preview";
import { ProductCapabilityShowcase } from "@/components/kenoo/product-capability-showcase";
import { ProductPricingCta } from "@/components/kenoo/product-pricing-cta";
import { ProductFaq } from "@/components/kenoo/product-faq";
import { SiteShell } from "@/components/kenoo/site-shell";
import {
  FEATURED_PRODUCTS,
  type FeaturedProduct,
} from "@/lib/featured-products";
import { KENOO_PORTAL_URL } from "@/lib/urls";

type FeaturedProductPageProps = {
  product: FeaturedProduct;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function FeaturedProductPage({ product }: FeaturedProductPageProps) {
  const others = FEATURED_PRODUCTS.filter((p) => p.slug !== product.slug);

  return (
    <SiteShell>
      <section className="relative overflow-hidden pt-16 md:pt-[4.25rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 45% at 50% -8%, ${product.accentSoft}, transparent 55%), linear-gradient(180deg, #fcfcfc 0%, #ffffff 42%, #f7f8fa 100%)`,
          }}
        />

        <div className="relative mx-auto max-w-6xl px-5 pt-6 md:px-8 md:pt-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-sm text-kenoo-muted"
          >
            <Link
              href="/"
              className="transition-colors hover:text-kenoo-ink"
            >
              Home
            </Link>
            <ChevronRight className="size-3.5 opacity-50" aria-hidden />
            <Link
              href="/product"
              className="transition-colors hover:text-kenoo-ink"
            >
              Products
            </Link>
            <ChevronRight className="size-3.5 opacity-50" aria-hidden />
            <span className="text-kenoo-ink">{product.name}</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="mx-auto max-w-2xl pb-10 pt-14 text-center md:pb-12 md:pt-20"
          >
            <div className="inline-flex items-center gap-2.5">
              <div
                className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]"
                style={{
                  background: `linear-gradient(145deg, #ffffff, ${product.accentSoft})`,
                }}
              >
                <Image
                  src={product.icon}
                  alt=""
                  width={30}
                  height={30}
                  className="object-contain"
                  priority
                />
              </div>
              <p className="font-display text-xl font-semibold tracking-[-0.02em] text-kenoo-ink">
                {product.name}
              </p>
            </div>

            <h1 className="mt-5 font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.045em] text-kenoo-ink sm:text-5xl md:text-[3.5rem]">
              {product.tagline}
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-kenoo-muted md:text-lg">
              {product.description}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ChromeFrame>
                <a
                  href={KENOO_PORTAL_URL}
                  className="inline-flex h-12 min-w-[10.5rem] items-center justify-center rounded-[10.5px] bg-kenoo-ink px-6 text-sm font-medium text-white transition-colors hover:bg-black"
                >
                  Get started
                </a>
              </ChromeFrame>
              <a
                href={product.appHref}
                className="inline-flex h-12 min-w-[10.5rem] items-center justify-center gap-1.5 rounded-xl border border-kenoo-border bg-white px-6 text-sm font-medium text-kenoo-ink transition-colors hover:bg-kenoo-subtle"
              >
                Open {product.name}
                <ArrowUpRight className="size-3.5 opacity-70" />
              </a>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.18, ease }}
          className="relative mx-auto max-w-5xl px-5 md:px-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-8 -top-6 h-28"
            style={{
              background: `radial-gradient(ellipse at center, ${product.accentSoft}, transparent 70%)`,
            }}
          />
          <div className="relative overflow-hidden rounded-t-[1.35rem] shadow-[0_32px_80px_-40px_rgba(17,17,17,0.4)]">
            <ChromeFrame className="flex w-full rounded-t-[1.35rem] rounded-b-none">
              <div className="w-full overflow-hidden rounded-t-[19.5px] bg-white">
                <div className="max-h-[15rem] overflow-hidden sm:max-h-[19rem] md:max-h-[24rem] lg:max-h-[28rem]">
                  <DashboardPreview slug={product.slug} />
                </div>
              </div>
            </ChromeFrame>
          </div>
        </motion.div>
      </section>

      <ProductCapabilityShowcase product={product} />

      <section className="border-t border-kenoo-border bg-kenoo-canvas">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            More from Kenoo
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-kenoo-ink md:text-3xl">
            Other polished apps
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/product/${other.slug}`}
                  className="group flex h-full items-start gap-4 rounded-2xl border border-kenoo-border bg-kenoo-surface px-5 py-5 transition-colors hover:border-kenoo-ink/20 hover:bg-kenoo-white"
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white to-kenoo-subtle shadow-[0_2px_6px_-2px_rgba(0,0,0,0.12)]">
                    <Image
                      src={other.icon}
                      alt=""
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <span className="min-w-0 pt-0.5">
                    <span className="flex items-center gap-1.5 font-display text-lg font-semibold tracking-[-0.02em] text-kenoo-ink">
                      {other.name}
                      <ArrowUpRight className="size-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-kenoo-muted">
                      {other.tagline}. {other.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ProductFaq product={product} />

      <ProductPricingCta />
    </SiteShell>
  );
}
