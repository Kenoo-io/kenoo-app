"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { wallsToast } from "@/components/ui/walls-toast";
import type { OrganizationRecord } from "@/lib/organizations-shared";

export type OrganizationDraft = {
  name: string;
  website: string;
  description: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
};

const EMPTY_DRAFT: OrganizationDraft = {
  name: "",
  website: "",
  description: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  countryCode: "",
};

export type WizardStep = {
  id: string;
  path: string;
  label: string;
  description: string;
};

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "profile",
    path: "/account/new/profile",
    label: "Profile",
    description: "Name, icon, and website",
  },
  {
    id: "contact",
    path: "/account/new/contact",
    label: "Contact",
    description: "Email and phone",
  },
  {
    id: "address",
    path: "/account/new/address",
    label: "Address",
    description: "Mailing address",
  },
  {
    id: "review",
    path: "/account/new/review",
    label: "Review",
    description: "Confirm and create",
  },
];

type PendingIcon = { file: File; previewUrl: string };

type WizardContextValue = {
  draft: OrganizationDraft;
  setField: <K extends keyof OrganizationDraft>(
    key: K,
    value: OrganizationDraft[K],
  ) => void;
  pendingIcon: PendingIcon | null;
  setPendingIcon: (icon: PendingIcon | null) => void;
  creating: boolean;
  goToStep: (stepId: string) => void;
  goNext: (fromStepId: string) => void;
  goBack: (fromStepId: string) => void;
  cancel: () => void;
  submit: () => Promise<void>;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [draft, setDraft] = useState<OrganizationDraft>(EMPTY_DRAFT);
  const [pendingIcon, setPendingIcon] = useState<PendingIcon | null>(null);
  const [creating, setCreating] = useState(false);

  const setField = useCallback(
    <K extends keyof OrganizationDraft>(key: K, value: OrganizationDraft[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const cancel = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const goToStep = useCallback(
    (stepId: string) => {
      const step = WIZARD_STEPS.find((candidate) => candidate.id === stepId);
      if (step) router.push(step.path);
    },
    [router],
  );

  const goNext = useCallback(
    (fromStepId: string) => {
      if (fromStepId === "profile" && !draft.name.trim()) {
        wallsToast.error("Missing fields", "Organization name is required");
        return;
      }
      const index = WIZARD_STEPS.findIndex((step) => step.id === fromStepId);
      const next = WIZARD_STEPS[index + 1];
      if (next) router.push(next.path);
    },
    [draft.name, router],
  );

  const goBack = useCallback(
    (fromStepId: string) => {
      const index = WIZARD_STEPS.findIndex((step) => step.id === fromStepId);
      const previous = WIZARD_STEPS[index - 1];
      if (previous) router.push(previous.path);
      else cancel();
    },
    [cancel, router],
  );

  const submit = useCallback(async () => {
    if (!draft.name.trim()) {
      wallsToast.error("Missing fields", "Organization name is required");
      goToStep("profile");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          website: draft.website.trim() || null,
          description: draft.description.trim() || null,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          addressLine1: draft.addressLine1.trim() || null,
          addressLine2: draft.addressLine2.trim() || null,
          city: draft.city.trim() || null,
          stateProvince: draft.stateProvince.trim() || null,
          postalCode: draft.postalCode.trim() || null,
          countryCode: draft.countryCode.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        wallsToast.error(
          "Error",
          payload.error || "Failed to create organization",
        );
        return;
      }

      const payload = (await response.json()) as {
        organization?: OrganizationRecord;
      };

      if (!payload.organization) {
        wallsToast.error("Error", "Failed to create organization");
        return;
      }

      if (pendingIcon) {
        try {
          const formData = new FormData();
          formData.append("file", pendingIcon.file);
          formData.append(
            "target",
            JSON.stringify({
              kind: "organization-icon",
              organizationId: payload.organization.id,
            }),
          );
          await fetch("/api/upload/image", { method: "POST", body: formData });
        } catch {
          // Non-fatal: the organization can still upload an icon from settings.
        }
      }

      try {
        await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: payload.organization.id }),
        });
      } catch {
        // Non-fatal: the org is still created, just not switched to yet.
      }

      wallsToast.success("Created", "Organization created successfully");
      window.location.href = "/settings";
    } finally {
      setCreating(false);
    }
  }, [draft, goToStep, pendingIcon, router]);

  const value = useMemo<WizardContextValue>(
    () => ({
      draft,
      setField,
      pendingIcon,
      setPendingIcon,
      creating,
      goToStep,
      goNext,
      goBack,
      cancel,
      submit,
    }),
    [cancel, creating, draft, goBack, goNext, goToStep, pendingIcon, setField, submit],
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
