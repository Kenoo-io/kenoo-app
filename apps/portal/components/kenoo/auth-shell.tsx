import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  /** Wider content (e.g. post-login app launcher). */
  wide?: boolean;
  topRight?: ReactNode;
  /** Decorative layer rendered behind the authentication content. */
  background?: ReactNode;
};

export function AuthShell({
  children,
  wide = false,
  topRight,
  background,
}: AuthShellProps) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-kenoo-canvas px-6 py-12">
      {background ? <div aria-hidden className="pointer-events-none absolute inset-0 z-0">{background}</div> : null}
      {topRight ? (
        <div className="absolute top-4 right-4 z-20 sm:right-6">{topRight}</div>
      ) : null}

      <div
        className={`relative z-10 w-full text-center ${
          wide ? "max-w-3xl" : "max-w-sm space-y-8"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-kenoo-ink sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-kenoo-muted">{description}</p>
      ) : null}
    </div>
  );
}
