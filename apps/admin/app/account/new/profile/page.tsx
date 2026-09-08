"use client";

import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { OrganizationIconPicker } from "@/components/admin/adminOrganizations/organization-profile-fields";

import { useWizard } from "../wizard-context";

export default function ProfileStepPage() {
  const { draft, setField, pendingIcon, setPendingIcon } = useWizard();

  return (
    <div className="space-y-8">
      <div className="border-b border-neutral-100 pb-4">
        <h3 className="text-base font-medium text-neutral-800">Profile</h3>
        <p className="mt-1 text-sm font-light text-neutral-500">
          Give the organization a name, icon, and website.
        </p>
      </div>

      <div className="flex flex-col items-start gap-2">
        <OrganizationIconPicker
          previewUrl={pendingIcon?.previewUrl ?? null}
          onSelectFile={(file) =>
            setPendingIcon({ file, previewUrl: URL.createObjectURL(file) })
          }
        />
        <p className="text-xs text-neutral-500">Click to add an icon</p>
      </div>

      <div className="space-y-4">
        <FloatingLabelInput
          label="Organization name"
          value={draft.name}
          onChange={(event) => setField("name", event.target.value)}
          autoFocus
        />
        <FloatingLabelInput
          label="Website"
          value={draft.website}
          onChange={(event) => setField("website", event.target.value)}
        />
      </div>
    </div>
  );
}
