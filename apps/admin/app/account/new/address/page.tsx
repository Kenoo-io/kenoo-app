"use client";

import { FloatingLabelInput } from "@/components/ui/floating-label-input";

import { useWizard } from "../wizard-context";

export default function AddressStepPage() {
  const { draft, setField } = useWizard();

  return (
    <div className="space-y-8">
      <div className="border-b border-neutral-100 pb-4">
        <h3 className="text-base font-medium text-neutral-800">Address</h3>
        <p className="mt-1 text-sm font-light text-neutral-500">
          Mailing and invoice address.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingLabelInput
          containerClassName="sm:col-span-2"
          label="Address line 1"
          value={draft.addressLine1}
          onChange={(event) => setField("addressLine1", event.target.value)}
          autoFocus
        />
        <FloatingLabelInput
          containerClassName="sm:col-span-2"
          label="Address line 2"
          value={draft.addressLine2}
          onChange={(event) => setField("addressLine2", event.target.value)}
        />
        <FloatingLabelInput
          label="City"
          value={draft.city}
          onChange={(event) => setField("city", event.target.value)}
        />
        <FloatingLabelInput
          label="State / Province"
          value={draft.stateProvince}
          onChange={(event) => setField("stateProvince", event.target.value)}
        />
        <FloatingLabelInput
          label="Postal code"
          value={draft.postalCode}
          onChange={(event) => setField("postalCode", event.target.value)}
        />
        <FloatingLabelInput
          label="Country code"
          value={draft.countryCode}
          onChange={(event) =>
            setField("countryCode", event.target.value.toUpperCase())
          }
        />
      </div>
    </div>
  );
}
