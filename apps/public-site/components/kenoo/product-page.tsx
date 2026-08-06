import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FinalCta } from "@/components/kenoo/final-cta";
import { SiteShell } from "@/components/kenoo/site-shell";
import { FEATURED_PRODUCTS } from "@/lib/featured-products";
import { KENOO_MODULES } from "@/lib/modules";

export default function ProductPage() {
  return (
    <SiteShell>
      <section className="border-b border-kenoo-border pt-16 md:pt-[4.25rem]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Products
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-[-0.045em] text-kenoo-ink md:text-5xl">
            Apps that stay simple under real work.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-kenoo-muted md:text-lg">
            Start with the polished Kenoo apps (AdPilot, CRM, and Health), then
            grow into the wider business OS as your team is ready.
          </p>
        </div>
      </section>

      <section className="bg-kenoo-canvas">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Featured apps
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-4xl">
            Built and ready
          </h2>
          <ul className="mt-12 space-y-6">
            {FEATURED_PRODUCTS.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/product/${product.slug}`}
                  className="group flex flex-col gap-6 rounded-[1.75rem] border border-kenoo-border bg-kenoo-surface p-6 transition-colors hover:border-kenoo-ink/15 hover:bg-kenoo-white sm:flex-row sm:items-start sm:gap-8 md:p-8"
                >
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
