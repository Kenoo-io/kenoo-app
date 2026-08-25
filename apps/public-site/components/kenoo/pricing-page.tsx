import { SiteShell } from "@/components/kenoo/site-shell";
import { PRICING_TIERS } from "@/lib/pricing";
import { KENOO_PORTAL_URL } from "@/lib/urls";

export default function PricingPage() {
  return (
    <SiteShell>
      <section className="border-b border-kenoo-border pt-16 md:pt-[4.25rem]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Pricing
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold tracking-[-0.045em] text-kenoo-ink md:text-5xl">
            Straightforward pricing.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-kenoo-muted md:text-lg">
            Clear plans with room to grow. No surprise add-ons.
          </p>
        </div>
      </section>

      <section className="bg-kenoo-canvas">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 md:grid-cols-3 md:px-8 md:py-24">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.featured
                  ? "flex flex-col rounded-2xl border border-kenoo-ink bg-kenoo-surface p-6 md:p-8"
                  : "flex flex-col rounded-2xl border border-kenoo-border bg-kenoo-surface p-6 md:p-8"
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-semibold tracking-[-0.03em]">
                  {tier.name}
                </h2>
                {tier.featured ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-kenoo-accent">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
                {tier.price}
                {tier.price.startsWith("$") ? (
                  <span className="text-base font-normal text-kenoo-muted">
                    /mo
                  </span>
                ) : null}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-kenoo-muted">
                {tier.blurb}
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-kenoo-ink">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-kenoo-accent">·</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={tier.name === "Scale" ? "/enterprise" : KENOO_PORTAL_URL}
                className={
                  tier.featured
                    ? "mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-kenoo-accent text-sm font-medium text-white transition-colors hover:bg-kenoo-accent-hover"
                    : "mt-8 inline-flex h-11 items-center justify-center rounded-xl border border-kenoo-border text-sm font-medium text-kenoo-ink transition-colors hover:bg-kenoo-subtle"
                }
              >
                {tier.name === "Scale" ? "Talk to sales" : "Get started"}
              </a>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
