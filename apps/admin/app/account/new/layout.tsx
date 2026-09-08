"use client";

import { Loader2, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";

import { WIZARD_STEPS, WizardProvider, useWizard } from "./wizard-context";

function WizardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { creating, goNext, goBack, cancel, submit } = useWizard();

  const currentIndex = Math.max(
    0,
    WIZARD_STEPS.findIndex((step) => step.path === pathname),
  );
  const currentStep = WIZARD_STEPS[currentIndex];
  const isLastStep = currentIndex === WIZARD_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-kenoo-white">
      <Toaster />

      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-neutral-100 px-4 sm:px-6">
        <button
          type="button"
          onClick={cancel}
          aria-label="Close"
          className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-900"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-base font-medium tracking-tight text-neutral-900">
          New organization
        </h2>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-xl">{children}</div>
      </main>

      <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4">
        {currentIndex > 0 ? (
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={() => goBack(currentStep.id)}
            className="rounded-lg border-neutral-200 bg-kenoo-white text-neutral-800 hover:bg-neutral-50"
          >
            Back
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={creating}
          onClick={() => (isLastStep ? void submit() : goNext(currentStep.id))}
          className="rounded-lg bg-neutral-950 px-5 text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLastStep ? "Create organization" : "Continue"}
        </Button>
      </footer>
    </div>
  );
}

export default function NewOrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WizardProvider>
      <WizardChrome>{children}</WizardChrome>
    </WizardProvider>
  );
}
