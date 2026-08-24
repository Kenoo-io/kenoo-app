const items = [
  "Meta Ads",
  "Google Ads",
  "CRM",
  "Pipeline",
  "Projects",
  "Invoices",
  "Forecasts",
  "Health",
  "AI assist",
  "Workspace keys",
];

export function CapabilityStrip() {
  const loop = [...items, ...items];

  return (
    <section className="border-y border-kenoo-border bg-kenoo-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4 md:px-8">
        <p className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-kenoo-muted sm:block">
          Built in
        </p>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-kenoo-surface to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-kenoo-surface to-transparent" />
          <div className="kenoo-marquee-track flex w-max gap-8 pr-8">
            {loop.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="shrink-0 text-sm font-medium text-kenoo-ink/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
