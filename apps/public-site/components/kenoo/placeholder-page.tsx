import { FinalCta } from "@/components/kenoo/final-cta";
import { SiteShell } from "@/components/kenoo/site-shell";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <SiteShell>
      <section className="border-b border-kenoo-border pt-16 md:pt-[4.25rem]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-[-0.045em] text-kenoo-ink md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-kenoo-muted md:text-lg">
            {description}
          </p>
        </div>
      </section>

      <FinalCta />
    </SiteShell>
  );
}
