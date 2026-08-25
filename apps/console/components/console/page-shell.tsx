export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      <header className="space-y-1.5">
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
