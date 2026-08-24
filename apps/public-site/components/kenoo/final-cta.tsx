import { KENOO_PORTAL_URL } from "@/lib/urls";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-kenoo-border bg-kenoo-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 50% 120%, rgba(11,110,255,0.14), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="overflow-hidden rounded-[2rem] border border-kenoo-border bg-kenoo-surface px-6 py-12 text-center shadow-[0_24px_80px_-48px_rgba(17,17,17,0.45)] md:px-16 md:py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kenoo-muted">
            Get started
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-[-0.045em] text-kenoo-ink md:text-5xl">
            Start with a clean workspace.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-kenoo-muted">
            Get set up quickly, then grow into the rest of the platform when your
            team is ready. No extra installs. One sign-in.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={KENOO_PORTAL_URL}
              className="inline-flex h-12 w-full min-w-[11rem] items-center justify-center rounded-full bg-kenoo-ink px-6 text-sm font-medium text-white transition-colors hover:bg-black sm:w-auto"
            >
              Get started
            </a>
            <a
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full border border-kenoo-border bg-white px-6 text-sm font-medium text-kenoo-ink transition-colors hover:bg-kenoo-subtle"
            >
              Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
