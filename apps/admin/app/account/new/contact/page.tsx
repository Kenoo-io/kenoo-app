"use client";

import { FloatingLabelInput } from "@/components/ui/floating-label-input";

import { useWizard } from "../wizard-context";

export default function ContactStepPage() {
  const { draft, setField } = useWizard();

  return (
    <div className="space-y-8">
      <div className="border-b border-neutral-100 pb-4">
        <h3 className="text-base font-medium text-neutral-800">Contact</h3>
        <p className="mt-1 text-sm font-light text-neutral-500">
          How people can reach this organization.
        </p>
      </div>

      <div className="space-y-4">
        <FloatingLabelInput
          label="Description"
          value={draft.description}
          onChange={(event) => setField("description", event.target.value)}
          autoFocus
        />
        <FloatingLabelInput
          label="Email"
          value={draft.email}
          onChange={(event) => setField("email", event.target.value)}
        />
        <FloatingLabelInput
          label="Phone"
          value={draft.phone}
          onChange={(event) => setField("phone", event.target.value)}
        />
      </div>
    </div>
  );
}
