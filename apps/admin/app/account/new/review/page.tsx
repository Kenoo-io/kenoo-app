"use client";

import { OrganizationAvatar } from "@/components/admin/adminOrganizations/organization-profile-fields";

import { useWizard, WIZARD_STEPS } from "../wizard-context";

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-neutral-950">
        {value}
      </span>
    </div>
  );
}

export default function ReviewStepPage() {
  const { draft, pendingIcon, goToStep } = useWizard();

  const address = [
    draft.addressLine1,
    draft.addressLine2,
    [draft.city, draft.stateProvince, draft.postalCode].filter(Boolean).join(", "),
    draft.countryCode,
  ]
    .filter((part) => part && part.trim())
    .join("\n");

  return (
    <div className="space-y-8">
      <div className="border-b border-neutral-100 pb-4">
        <h3 className="text-base font-medium text-neutral-800">Review</h3>
        <p className="mt-1 text-sm font-light text-neutral-500">
          Confirm the details before creating the organization.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <OrganizationAvatar
          name={draft.name || "New organization"}
          iconUrl={pendingIcon?.previewUrl ?? null}
        />
        <div>
          <p className="text-base font-semibold text-neutral-950">
            {draft.name || "Untitled organization"}
          </p>
          {draft.website ? (
            <p className="text-sm text-neutral-500">{draft.website}</p>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 px-4">
        <SummaryRow label="Description" value={draft.description} />
        <SummaryRow label="Email" value={draft.email} />
        <SummaryRow label="Phone" value={draft.phone} />
        <SummaryRow label="Address" value={address} />
      </div>

      <button
        type="button"
        onClick={() => goToStep(WIZARD_STEPS[0].id)}
        className="text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        Edit details
      </button>
    </div>
  );
}
