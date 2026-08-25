const stats = [
  { value: "3", label: "Live products shipping today" },
  { value: "2", label: "Ad platforms in AdPilot" },
  { value: "1", label: "Workspace for the whole company" },
];

const points = [
  "Status, ownership, and progress stay on the record, not buried in a chat thread.",
  "Budget and campaign changes in AdPilot can be previewed before anything goes live.",
  "Connected advertiser data lives as customer content inside the workspace that connected it.",
];

export function Reliability() {
  return (
    <section className="relative overflow-hidden border-t border-kenoo-ink bg-kenoo-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 80% 0%, rgba(11,110,255,0.45), transparent 55%), radial-gradient(ellipse 40% 40% at 10% 100%, rgba(255,255,255,0.08), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, #000, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">
            Transparency
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] md:text-[2.75rem]">
            Always clear on what’s happening.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65 md:text-lg">
            Status, ownership, and progress stay visible across the product so
            your team can act with confidence and less second-guessing.
          </p>
        </div>

        <dl className="mt-14 grid gap-6 border-y border-white/10 py-8 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-display text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
                {stat.value}
              </dt>
              <dd className="mt-2 text-sm text-white/55">{stat.label}</dd>
            </div>
          ))}
        </dl>

        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {points.map((point) => (
            <li
              key={point}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-white/75"
            >
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
