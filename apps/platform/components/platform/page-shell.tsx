import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageShell({
  title,
  description,
  backHref,
  backLabel,
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 py-8 md:px-10 md:py-10">
      <header className="space-y-1.5">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel ?? "Back"}
          </Link>
        ) : null}
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-950">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-neutral-500">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
