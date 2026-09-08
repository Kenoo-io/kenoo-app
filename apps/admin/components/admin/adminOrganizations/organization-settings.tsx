"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Loader2, Trash2, Users } from "lucide-react";

import { wallsToast } from "@/components/ui/walls-toast";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useUploadOrganizationIcon } from "@/hooks/useMutations";
import type { OrganizationRecord } from "@/lib/organizations-shared";
import { canEditOrganization } from "@/lib/organizations-shared";
import { useActiveAccount } from "@/components/active-account-context";
import { PageShell } from "@/components/admin/page-shell";
import {
  OrganizationIconUpload,
  SectionCard,
} from "./organization-profile-fields";

export default function OrganizationSettingsPage() {
  const { activeAccount, activeAccountId, loading: accountLoading } =
    useActiveAccount();
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const saveRequestIdRef = useRef(0);
  const formRef = useRef({
    name: "",
    iconUrl: "",
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
  });

  const { mutate: uploadOrganizationIcon, isUploading: isUploadingIcon } =
    useUploadOrganizationIcon(selectedId);

  const [form, setForm] = useState({
    name: "",
    iconUrl: "",
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
  });
  formRef.current = form;

  const selectedOrganization = useMemo(
    () =>
      organizations.find((organization) => organization.id === selectedId) ??
      null,
    [organizations, selectedId],
  );

  const canEdit = selectedOrganization
    ? canEditOrganization(selectedOrganization.role)
    : false;

  const displayIconUrl =
    iconPreviewUrl ||
    form.iconUrl.trim() ||
    selectedOrganization?.iconUrl ||
    null;

  const handleIconUpload = useCallback(
    async (file: File) => {
      setIconPreviewUrl(URL.createObjectURL(file));

      const result = await uploadOrganizationIcon(file);
      if (!result?.url || !selectedId) {
        return;
      }

      setForm((current) => ({ ...current, iconUrl: result.url }));
      setIconPreviewUrl(result.url);
      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === selectedId
            ? { ...organization, iconUrl: result.url }
            : organization,
        ),
      );
    },
    [selectedId, uploadOrganizationIcon],
  );

  const loadOrganizations = useCallback(async () => {
    if (!activeAccountId || accountLoading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/organizations", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as {
        organizations?: OrganizationRecord[];
        activeAccountId?: string | null;
        accountType?: "personal" | "organization";
      };

      const next = payload.organizations ?? [];
      setOrganizations(next);
      setSelectedId(
        payload.activeAccountId ?? activeAccountId ?? next[0]?.id ?? null,
      );
    } finally {
      setLoading(false);
    }
  }, [activeAccountId, accountLoading]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    setIconPreviewUrl(null);
  }, [selectedOrganization?.id]);

  useEffect(() => {
    if (!selectedOrganization) {
      setForm({
        name: "",
        iconUrl: "",
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
      });
      return;
    }

    setForm({
      name: selectedOrganization.name,
      iconUrl: selectedOrganization.iconUrl ?? "",
      website: selectedOrganization.website ?? "",
      description: selectedOrganization.description ?? "",
      email: selectedOrganization.email ?? "",
      phone: selectedOrganization.phone ?? "",
      addressLine1: selectedOrganization.addressLine1 ?? "",
      addressLine2: selectedOrganization.addressLine2 ?? "",
      city: selectedOrganization.city ?? "",
      stateProvince: selectedOrganization.stateProvince ?? "",
      postalCode: selectedOrganization.postalCode ?? "",
      countryCode: selectedOrganization.countryCode ?? "",
    });
    // Only rehydrate when switching organizations — autosave updates must not clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: selectedOrganization?.id
  }, [selectedOrganization?.id]);

  const isFormChanged = selectedOrganization
    ? form.name !== selectedOrganization.name ||
      form.website !== (selectedOrganization.website ?? "") ||
      form.description !== (selectedOrganization.description ?? "") ||
      form.email !== (selectedOrganization.email ?? "") ||
      form.phone !== (selectedOrganization.phone ?? "") ||
      form.addressLine1 !== (selectedOrganization.addressLine1 ?? "") ||
      form.addressLine2 !== (selectedOrganization.addressLine2 ?? "") ||
      form.city !== (selectedOrganization.city ?? "") ||
      form.stateProvince !== (selectedOrganization.stateProvince ?? "") ||
      form.postalCode !== (selectedOrganization.postalCode ?? "") ||
      form.countryCode !== (selectedOrganization.countryCode ?? "")
    : false;

  useEffect(() => {
    if (!selectedId || !canEdit || !isFormChanged) return;

    const timeoutId = window.setTimeout(async () => {
      const snapshot = formRef.current;
      if (!snapshot.name.trim()) {
        wallsToast.error("Missing name", "Organization name is required");
        return;
      }

      const requestId = ++saveRequestIdRef.current;
      setSaving(true);

      try {
        const response = await fetch(`/api/organizations/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: snapshot.name.trim(),
            iconUrl: snapshot.iconUrl.trim() || null,
            website: snapshot.website.trim() || null,
            description: snapshot.description.trim() || null,
            email: snapshot.email.trim() || null,
            phone: snapshot.phone.trim() || null,
            addressLine1: snapshot.addressLine1.trim() || null,
            addressLine2: snapshot.addressLine2.trim() || null,
            city: snapshot.city.trim() || null,
            stateProvince: snapshot.stateProvince.trim() || null,
            postalCode: snapshot.postalCode.trim() || null,
            countryCode: snapshot.countryCode.trim() || null,
          }),
        });

        if (requestId !== saveRequestIdRef.current) return;

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          wallsToast.error(
            "Error",
            payload.error || "Failed to save organization settings",
          );
          return;
        }

        const payload = (await response.json()) as {
          organization?: OrganizationRecord;
        };

        if (payload.organization) {
          setOrganizations((current) =>
            current.map((organization) =>
              organization.id === payload.organization!.id
                ? payload.organization!
                : organization,
            ),
          );
        }
      } finally {
        if (requestId === saveRequestIdRef.current) {
          setSaving(false);
        }
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [selectedId, canEdit, isFormChanged, form]);

  async function handleDelete() {
    if (!selectedId || !canEdit) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/organizations/${selectedId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        wallsToast.error(
          "Error",
          payload.error || "Failed to delete organization",
        );
        return;
      }

      const deletedId = selectedId;
      const remaining = organizations.filter(
        (organization) => organization.id !== deletedId,
      );

      setOrganizations(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setShowDeleteDialog(false);
      wallsToast.success(
        "Organization deleted",
        "The organization has been permanently removed",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (accountLoading || loading) {
    return (
      <PageShell title="Account">
        <div className="h-40 animate-pulse rounded-xl bg-[#F3F3F4]" />
        <div className="h-56 animate-pulse rounded-xl border border-neutral-200" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={
        activeAccount?.accountType === "organization"
          ? "Organization profile"
          : "Account settings"
      }
      description={`Update the profile and contact details for ${activeAccount?.name ?? "this account"}.`}
      actions={
        saving ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </span>
        ) : undefined
      }
    >
      <Toaster />

      {activeAccount?.accountType === "personal" ? (
        <div className="rounded-xl border border-neutral-200 px-6 py-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm font-medium text-neutral-900">
            Personal account selected
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Switch to an organization in the sidebar to edit its profile, or open
            account details for this personal account.
          </p>
          {activeAccountId ? (
            <Button
              asChild
              variant="outline"
              className="mt-5 rounded-lg border-neutral-200 bg-kenoo-white text-neutral-800 hover:bg-neutral-50"
            >
              <Link href={`/accounts/${activeAccountId}`}>
                Open account details
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {activeAccount?.accountType === "organization" &&
      organizations.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 px-6 py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm font-medium text-neutral-900">
            No organization profile found
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Create an organization to manage its profile here.
          </p>
        </div>
      ) : null}

      {activeAccount?.accountType === "organization" &&
      selectedOrganization ? (
        <>
          <SectionCard
            title="Profile"
            description="Name, icon, and public details"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <OrganizationIconUpload
                  name={form.name || selectedOrganization.name}
                  iconUrl={displayIconUrl}
                  canEdit={canEdit}
                  isUploading={isUploadingIcon}
                  onSelectFile={(file) => void handleIconUpload(file)}
                />
                {canEdit ? (
                  <p className="text-center text-xs text-neutral-500">
                    Click to change icon
                  </p>
                ) : null}
              </div>

              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                <FloatingLabelInput
                  containerClassName="sm:col-span-2"
                  label="Organization name"
                  value={form.name}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <FloatingLabelInput
                  containerClassName="sm:col-span-2"
                  label="Website"
                  value={form.website}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                />
                <FloatingLabelInput
                  containerClassName="sm:col-span-2"
                  label="Description"
                  value={form.description}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Contact"
            description="How people reach this organization"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatingLabelInput
                label="Email"
                value={form.email}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
              <FloatingLabelInput
                label="Phone"
                value={form.phone}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Location"
            description="Mailing and invoice address"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatingLabelInput
                containerClassName="sm:col-span-2"
                label="Address line 1"
                value={form.addressLine1}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    addressLine1: event.target.value,
                  }))
                }
              />
              <FloatingLabelInput
                containerClassName="sm:col-span-2"
                label="Address line 2"
                value={form.addressLine2}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    addressLine2: event.target.value,
                  }))
                }
              />
              <FloatingLabelInput
                label="City"
                value={form.city}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
              />
              <FloatingLabelInput
                label="State / Province"
                value={form.stateProvince}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stateProvince: event.target.value,
                  }))
                }
              />
              <FloatingLabelInput
                label="Postal code"
                value={form.postalCode}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    postalCode: event.target.value,
                  }))
                }
              />
              <FloatingLabelInput
                label="Country code"
                value={form.countryCode}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    countryCode: event.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
          </SectionCard>

          <section className="rounded-xl border border-neutral-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                  <Users className="h-5 w-5 text-neutral-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-950">
                    Users &amp; app access
                  </h2>
                  <p className="mt-0.5 text-[13px] text-neutral-500">
                    Invite members and assign app access when adding users.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="rounded-lg border-neutral-200 bg-kenoo-white text-neutral-800 hover:bg-neutral-50"
              >
                <Link href="/users">Manage users</Link>
              </Button>
            </div>
          </section>

          {canEdit ? (
            <section className="rounded-xl border border-red-100 bg-kenoo-white p-6">
              <h2 className="text-sm font-semibold text-neutral-950">
                Delete organization
              </h2>
              <p className="mt-1 max-w-2xl text-[13px] text-neutral-500">
                Permanently delete this organization and remove all members.
                This cannot be undone.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting || saving}
                onClick={() => setShowDeleteDialog(true)}
                className="mt-5 rounded-lg border-[#f6aea9] text-[#d93025] hover:bg-[#fce8e6]"
              >
                {isDeleting ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting…
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete organization
                  </span>
                )}
              </Button>

              <Dialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <DialogContent showCloseButton={!isDeleting}>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-medium text-neutral-950">
                        Delete organization?
                      </h2>
                      <p className="mt-2 text-sm text-neutral-500">
                        Are you sure you want to delete{" "}
                        <span className="font-medium text-neutral-950">
                          {selectedOrganization.name}
                        </span>
                        ? This cannot be undone.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isDeleting}
                        onClick={() => setShowDeleteDialog(false)}
                        className="rounded-lg border-neutral-200"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete()}
                        className="rounded-lg bg-[#d93025] text-white hover:bg-[#b3261e]"
                      >
                        {isDeleting ? (
                          <span className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting…
                          </span>
                        ) : (
                          "Delete organization"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </section>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
