import type { ReactNode } from "react";

import { cn } from "@walls/utils";

export function PageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 py-8 md:px-10 md:py-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageBody>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-semibold tracking-tight text-neutral-950">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-neutral-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </header>
      {children}
    </PageBody>
  );
}
