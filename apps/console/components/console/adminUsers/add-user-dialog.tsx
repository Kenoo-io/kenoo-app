"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";

type CreatedUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
};

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: CreatedUser) => void;
}

const modalSecondaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50";

const modalPrimaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";

export function AddUserDialog({
  open,
  onOpenChange,
  onUserCreated,
}: AddUserDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPassword, setSuccessPassword] = useState<string | null>(null);

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setError(null);
    setSuccessPassword(null);
  }

  function handleOpenChange(next: boolean) {
    if (!isSubmitting) {
      if (!next) reset();
      onOpenChange(next);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create user");
        return;
      }

      setSuccessPassword(data.tempPassword);
      onUserCreated(data.user);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md gap-0 rounded-xl border border-neutral-200 bg-kenoo-white p-5 shadow-xl backdrop-blur-none"
        overlayClassName="bg-black/40"
        showCloseButton={false}
      >
        {successPassword ? (
          <>
            <DialogTitle className="text-lg font-semibold text-neutral-950">
              User created
            </DialogTitle>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Share this temporary password with the user. For security reasons,{" "}
              <span className="font-semibold text-neutral-900">
                they should change it after signing in
              </span>
              .
            </p>
            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 py-2 px-3">
              <p className="text-xs font-medium text-neutral-500 mb-1">
                Temporary password
              </p>
              <p className="font-mono text-[13px] text-neutral-900 select-all break-all">
                {successPassword}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className={modalSecondaryButtonClass}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogTitle className="text-lg font-semibold text-neutral-950">
              Add new user
            </DialogTitle>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <FloatingLabelInput
                id="add-first-name"
                label="First name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSubmitting}
                autoComplete="given-name"
              />
              <FloatingLabelInput
                id="add-last-name"
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSubmitting}
                autoComplete="family-name"
              />
            </div>

            <FloatingLabelInput
              id="add-email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              containerClassName="mt-2"
            />

            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className={modalSecondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !firstName.trim() || !email.trim()}
                className={modalPrimaryButtonClass}
              >
                {isSubmitting ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
