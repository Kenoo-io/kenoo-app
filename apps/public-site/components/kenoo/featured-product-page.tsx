import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ChromeFrame } from "@/components/kenoo/chrome-frame";
import { FinalCta } from "@/components/kenoo/final-cta";
import { SiteShell } from "@/components/kenoo/site-shell";
import {
  FEATURED_PRODUCTS,
  type FeaturedProduct,
} from "@/lib/featured-products";
import { KENOO_PORTAL_URL } from "@/lib/urls";

type FeaturedProductPageProps = {
  product: FeaturedProduct;
};

export function FeaturedProductPage({ product }: FeaturedProductPageProps) {
  const others = FEATURED_PRODUCTS.filter((p) => p.slug !== product.slug);

  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-kenoo-border pt-16 md:pt-[4.25rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 15% -5%, ${product.accentSoft}, transparent 55%), radial-gradient(ellipse 45% 35% at 95% 15%, rgba(17,17,17,0.03), transparent 50%), linear-gradient(180deg, #fcfcfc 0%, #ffffff 60%, #fcfcfc 100%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white to-kenoo-subtle shadow-[0_2px_8px_-2px_rgba(0,0,0,0.14)]">
                  <Image
                    src={product.icon}
                    alt=""
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
                  Kenoo · {product.name}
                </p>
              </div>
              <h1 className="mt-6 font-display text-4xl font-semibold tracking-[-0.045em] text-kenoo-ink md:text-5xl">
                {product.tagline}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-kenoo-muted md:text-lg">
                {product.overview}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ChromeFrame>
                  <a
                    href={KENOO_PORTAL_URL}
                    className="inline-flex h-11 items-center justify-center rounded-[10.5px] bg-kenoo-white px-5 text-sm font-medium text-kenoo-ink transition-colors hover:bg-kenoo-subtle"
                  >
                    Get started
                  </a>
                </ChromeFrame>
                <a
                  href={product.appHref}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-kenoo-border bg-kenoo-surface px-5 text-sm font-medium text-kenoo-ink transition-colors hover:bg-kenoo-subtle"
                >
                  Open {product.name}
                  <ArrowUpRight className="size-3.5 opacity-60" />
                </a>
              </div>
            </div>

            <aside className="w-full max-w-sm shrink-0 rounded-[1.75rem] border border-kenoo-border/80 bg-kenoo-surface/80 p-6 shadow-[0_16px_40px_-28px_rgba(17,17,17,0.35)] backdrop-blur-sm md:mt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-kenoo-muted">
                At a glance
              </p>
              <p className="mt-3 text-sm leading-relaxed text-kenoo-ink">
                {product.description}
              </p>
              <dl className="mt-6 space-y-3 border-t border-kenoo-border pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-kenoo-muted">Product</dt>
                  <dd className="font-medium text-kenoo-ink">{product.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-kenoo-muted">Suite</dt>
                  <dd className="font-medium text-kenoo-ink">Kenoo</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-kenoo-muted">Company</dt>
                  <dd className="text-right font-medium text-kenoo-ink">
                    WALLS Entertainment Group Inc.
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-kenoo-border pt-5 text-sm">
                <Link
                  href="/privacy-policy"
                  className="text-kenoo-accent transition-colors hover:text-kenoo-accent-hover"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms-and-conditions"
                  className="text-kenoo-accent transition-colors hover:text-kenoo-accent-hover"
                >
                  Terms
                </Link>
                <Link
                  href="/contact"
                  className="text-kenoo-accent transition-colors hover:text-kenoo-accent-hover"
                >
                  Contact
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-kenoo-canvas">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Capabilities
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-4xl">
            What {product.name} does
          </h2>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {product.features.map((feature) => (
              <li key={feature.title} className="max-w-sm">
                <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-kenoo-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-kenoo-muted">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {product.compliance ? (
        <section className="border-t border-kenoo-border bg-kenoo-surface">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
              Transparency
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.04em] text-kenoo-ink md:text-4xl">
              {product.compliance.title}
            </h2>
            <div className="mt-8 max-w-3xl space-y-5">
              {product.compliance.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-base leading-relaxed text-kenoo-muted"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            {product.compliance.bullets?.length ? (
              <ul className="mt-8 max-w-3xl space-y-2.5 border-t border-kenoo-border pt-8">
                {product.compliance.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex gap-3 text-sm leading-relaxed text-kenoo-ink"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: product.accent }}
                      aria-hidden
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-kenoo-muted">
              Full details are in our{" "}
              <Link
                href="/privacy-policy"
                className="text-kenoo-accent underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>{" "}
              (Google user data and Advertising / AdPilot sections covering Meta
              Ads and Google Ads) and{" "}
              <Link
                href="/terms-and-conditions"
                className="text-kenoo-accent underline-offset-2 hover:underline"
              >
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </section>
      ) : null}

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

      <FinalCta />
    </SiteShell>
  );
}
