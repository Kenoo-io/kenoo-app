import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ChromeFrame } from "@/components/kenoo/chrome-frame";
import { DashboardPreview } from "@/components/kenoo/dashboard-preview";
import { FinalCta } from "@/components/kenoo/final-cta";
import { SiteShell } from "@/components/kenoo/site-shell";
import { FEATURED_PRODUCTS } from "@/lib/featured-products";
import { KENOO_MODULES } from "@/lib/modules";
import { KENOO_PORTAL_URL } from "@/lib/urls";

export default function ProductPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden pt-16 md:pt-[4.25rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 50% -8%, rgba(11,110,255,0.12), transparent 55%), linear-gradient(180deg, #fcfcfc 0%, #ffffff 42%, #f7f8fa 100%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-5 pt-10 md:px-8 md:pt-16">
          <div className="mx-auto max-w-2xl pb-10 text-center md:pb-12">
            <p className="inline-flex items-center gap-2 text-base font-medium tracking-[-0.01em] text-kenoo-ink">
              <span
                className="size-2 rounded-full bg-kenoo-accent"
                aria-hidden
              />
              Products
            </p>
            <h1 className="mt-5 font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.045em] text-kenoo-ink sm:text-5xl md:text-[3.5rem]">
              Apps that stay simple under real work.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-kenoo-muted md:text-lg">
              Start with the polished Kenoo apps (AdPilot, CRM, and Health), then
              grow into the wider business OS as your team is ready.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ChromeFrame>
                <a
                  href={KENOO_PORTAL_URL}
                  className="inline-flex h-12 min-w-[10.5rem] items-center justify-center rounded-[10.5px] bg-kenoo-accent px-6 text-sm font-medium text-white transition-colors hover:bg-kenoo-accent-hover"
                >
                  Get started
                </a>
              </ChromeFrame>
              <Link
                href="#featured"
                className="inline-flex h-12 min-w-[10.5rem] items-center justify-center rounded-xl border border-kenoo-accent bg-transparent px-6 text-sm font-medium text-kenoo-accent transition-colors hover:bg-kenoo-accent/5"
              >
                Explore apps
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl px-5 md:px-8">
          <div className="relative overflow-hidden rounded-t-[1.35rem] shadow-[0_32px_80px_-40px_rgba(17,17,17,0.4)]">
            <ChromeFrame className="flex w-full rounded-t-[1.35rem] rounded-b-none">
              <div className="w-full overflow-hidden rounded-t-[19.5px] bg-white">
                <div className="max-h-[15rem] overflow-hidden sm:max-h-[19rem] md:max-h-[24rem] lg:max-h-[28rem]">
                  <DashboardPreview slug="adpilot" />
                </div>
              </div>
            </ChromeFrame>
          </div>
        </div>
      </section>

      <section
        id="featured"
        className="scroll-mt-24 border-t border-kenoo-border bg-kenoo-canvas"
      >
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Featured apps
          </p>
          <h2 className="mx-auto mt-3 text-center font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-4xl">
            Built and ready
          </h2>
          <ul className="mt-12 space-y-6">
            {FEATURED_PRODUCTS.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/product/${product.slug}`}
                  className="group flex flex-col gap-6 overflow-hidden rounded-[1.75rem] border border-kenoo-border bg-kenoo-surface transition-colors hover:border-kenoo-ink/15 hover:bg-kenoo-white lg:flex-row lg:items-stretch"
                >
                  <div className="h-48 shrink-0 overflow-hidden border-b border-kenoo-border bg-[#fafafa] lg:h-auto lg:w-[46%] lg:border-b-0 lg:border-r">
                    <DashboardPreview slug={product.slug} variant="card" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-start gap-5 p-6 md:p-8">
                    <div
                      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)]"
                      style={{
                        background: `linear-gradient(145deg, #ffffff, ${product.accentSoft})`,
                      }}
                    >
                      <Image
                        src={product.icon}
                        alt=""
                        width={52}
                        height={52}
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-kenoo-ink">
                          {product.name}
                        </h3>
                        <span className="text-sm text-kenoo-muted">
                          {product.tagline}
                        </span>
                      </div>
                      <p className="mt-3 max-w-2xl text-base leading-relaxed text-kenoo-muted">
                        {product.description}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-kenoo-accent transition-colors group-hover:text-kenoo-accent-hover">
                        Explore {product.name}
                        <ArrowUpRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-kenoo-border bg-kenoo-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Platform angles
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-4xl">
            How the suite is organized
          </h2>
          <div className="mt-14 space-y-16 md:space-y-20">
            {KENOO_MODULES.map((module, index) => (
              <article
                key={module.id}
                id={module.id}
                className="scroll-mt-28 grid gap-6 md:grid-cols-[200px_1fr] md:gap-12"
              >
                <div>
                  <p className="font-mono text-xs text-kenoo-muted">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-kenoo-ink md:text-3xl">
                    {module.name}
                  </h3>
                </div>
                <div className="max-w-xl border-t border-kenoo-border pt-6 md:border-t-0 md:pt-0">
                  <p className="font-display text-xl tracking-[-0.02em] text-kenoo-ink">
                    {module.headline}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-kenoo-muted">
                    {module.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </SiteShell>
  );
}
