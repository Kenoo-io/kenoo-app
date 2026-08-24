"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Info,
  Lock,
  Plus,
  SquarePen,
  Search,
  SquareArrowOutUpRight,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@walls/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
import { Input } from "@walls/ui/input";
import { cn } from "@walls/utils";

import {
  canManageKeysForAccount,
  FloatingLabelAccountSelect,
} from "@/components/ui/floating-label-account-select";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import type { PlatformAccount } from "@/lib/account-types";
import { formatUsdFromCents } from "@/lib/money";
import type { PlatformApiKeyRow } from "@/lib/list-api-keys";

type StatusFilter = "all" | "active" | "revoked";

function formatShortDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function maskSecret(prefix: string): string {
  if (prefix.length <= 7) return `${prefix}…`;
  return `${prefix.slice(0, 7)}…`;
}

function truncateId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 18)}…` : value;
}

export function KeysPanel({
  initialKeys,
  canManage,
  currentUserName,
}: {
  initialKeys: PlatformApiKeyRow[];
  canManage: boolean;
  currentUserName: string;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingOriginalName, setEditingOriginalName] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [createAccountId, setCreateAccountId] = useState<string | null>(null);
  const [reloadOnClose, setReloadOnClose] = useState(false);

  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;
    setAccountsLoading(true);
    fetch("/api/accounts")
      .then(async (response) => {
        const payload = (await response.json()) as {
          accounts?: PlatformAccount[];
          activeAccountId?: string | null;
        };
        if (cancelled || !response.ok) return;
        const nextAccounts = payload.accounts ?? [];
        const nextActive = payload.activeAccountId ?? nextAccounts[0]?.id ?? null;
        setAccounts(nextAccounts);
        setActiveAccountId(nextActive);
        setCreateAccountId((current) => current ?? nextActive);
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [createOpen]);

  const selectedCreateAccount =
    accounts.find((account) => account.id === createAccountId) ??
    accounts[0] ??
    null;
  const canCreateOnSelected = selectedCreateAccount
    ? canManageKeysForAccount(selectedCreateAccount)
    : false;
  const canSaveEdit =
    editingName.trim().length > 0 &&
    editingName.trim() !== editingOriginalName;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return keys.filter((key) => {
      const isActive = !key.revoked_at;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "revoked" && isActive) return false;
      if (!needle) return true;
      return [
        key.name,
        key.tracking_id,
        key.key_prefix,
        key.created_by_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [keys, query, statusFilter]);

  async function createKey() {
    if (!selectedCreateAccount || !canCreateOnSelected) return;
    setPending(true);
    setError(null);
    const switched = selectedCreateAccount.id !== activeAccountId;
    try {
      if (switched) {
        const switchResponse = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: selectedCreateAccount.id }),
        });
        if (!switchResponse.ok) {
          throw new Error("Failed to switch project");
        }
        setActiveAccountId(selectedCreateAccount.id);
        setReloadOnClose(true);
      }

      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim() || "Secret key",
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        secret?: string;
        key?: { id: string; name: string; key_prefix: string; created_at: string };
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create key");
      }
      if (payload.key && !switched) {
        setKeys((current) => [
          {
            id: payload.key!.id,
            name: payload.key!.name,
            key_prefix: payload.key!.key_prefix,
            tracking_id: `key_${payload.key!.id.replaceAll("-", "").slice(0, 15)}`,
            last_used_at: null,
            created_at: payload.key!.created_at,
            revoked_at: null,
            created_by_name: currentUserName,
            monthly_spend_cents: 0,
          },
          ...current,
        ]);
      }
      setSecret(payload.secret ?? null);
      setCreateName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create key");
    } finally {
      setPending(false);
    }
  }

  async function saveName() {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name || name === editingOriginalName) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/keys/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to rename key");
      }
      setKeys((current) =>
        current.map((key) => (key.id === editingId ? { ...key, name } : key)),
      );
      closeEdit();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to rename key");
    } finally {
      setPending(false);
    }
  }

  async function revokeKey(keyId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to revoke key");
      }
      setKeys((current) =>
        current.map((key) =>
          key.id === keyId
            ? { ...key, revoked_at: new Date().toISOString() }
            : key,
        ),
      );
      setRevokeId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to revoke key");
    } finally {
      setPending(false);
    }
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function closeEdit() {
    setEditingId(null);
    setEditingName("");
    setEditingOriginalName("");
  }

  function closeCreate() {
    const shouldReload = reloadOnClose;
    setCreateOpen(false);
    setSecret(null);
    setCreateName("");
    setCopied(false);
    setCreateAccountId(null);
    setReloadOnClose(false);
    if (shouldReload) {
      window.location.reload();
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-8 md:px-10 md:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-950">
          API keys
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Store secrets in your backend. They are shown once at creation."
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <Lock className="h-4 w-4" />
          </button>
          <Link
            href="/usage"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            API Key Usage
            <SquareArrowOutUpRight className="h-3.5 w-3.5" />
          </Link>
          {canManage ? (
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-9 rounded-lg bg-neutral-950 px-3.5 text-sm text-white hover:bg-neutral-800"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create new secret key
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="h-9 rounded-full border-neutral-200 bg-neutral-50 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusFilter !== "all" ? (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-neutral-100 px-3 text-sm text-neutral-700"
            >
              <Check className="h-3.5 w-3.5" />
              {statusFilter === "active" ? "Active" : "Revoked"}
              <X className="h-3.5 w-3.5 text-neutral-400" />
            </button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Add filter
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("revoked")}>
                Revoked
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All statuses
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-sm text-neutral-400">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
          </span>
        </div>
      </div>

      {error && !createOpen && !editingId ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-[13px] font-normal text-neutral-400">
              <th className="py-3 pr-6 font-normal">Name</th>
              <th className="py-3 pr-6 font-normal">Status</th>
              <th className="py-3 pr-6 font-normal">Tracking ID</th>
              <th className="py-3 pr-6 font-normal">Secret key</th>
              <th className="py-3 pr-6 font-normal">Created</th>
              <th className="py-3 pr-6 font-normal">Expires</th>
              <th className="py-3 pr-6 font-normal">
                <span className="inline-flex items-center gap-1">
                  Last used
                  <Info
                    className="h-3.5 w-3.5"
                    aria-label="Updated when this key authenticates a Platform request"
                  />
                </span>
              </th>
              <th className="py-3 pr-6 font-normal">Created by</th>
              <th className="py-3 pr-6 font-normal">Permissions</th>
              <th className="py-3 pr-6 font-normal">Monthly spend</th>
              <th className="py-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="py-16 text-center text-sm text-neutral-500"
                >
                  {keys.length === 0
                    ? "No keys yet."
                    : "No keys match this search."}
                </td>
              </tr>
            ) : (
              filtered.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="py-4 pr-6 font-medium text-neutral-900">
                    {key.name}
                  </td>
                  <td className="py-4 pr-6 text-neutral-700">
                    {key.revoked_at ? "Revoked" : "Active"}
                  </td>
                  <td className="py-4 pr-6 font-mono text-[13px] text-neutral-600">
                    {truncateId(key.tracking_id)}
                  </td>
                  <td className="py-4 pr-6 font-mono text-[13px] text-neutral-600">
                    {maskSecret(key.key_prefix)}
                  </td>
                  <td className="py-4 pr-6 whitespace-nowrap text-neutral-700">
                    {formatShortDate(key.created_at)}
                  </td>
                  <td className="py-4 pr-6 text-neutral-700">Never</td>
                  <td className="py-4 pr-6 whitespace-nowrap text-neutral-700">
                    {key.last_used_at
                      ? formatShortDate(key.last_used_at)
                      : "Never"}
                  </td>
                  <td className="py-4 pr-6 whitespace-nowrap text-neutral-700">
                    {key.created_by_name}
                  </td>
                  <td className="py-4 pr-6 text-neutral-700">All</td>
                  <td className="py-4 pr-6 text-neutral-700">
                    {formatUsdFromCents(key.monthly_spend_cents)}
                  </td>
                  <td className="py-4">
                    {canManage && !key.revoked_at ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setError(null);
                            setEditingId(key.id);
                            setEditingName(key.name);
                            setEditingOriginalName(key.name);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                          aria-label="Rename key"
                        >
                          <SquarePen className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setRevokeId(key.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50"
                          aria-label="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <Modal onClose={closeCreate}>
          {secret ? (
            <>
              <h2 className="text-lg font-semibold text-neutral-950">
                Save your key
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Please save this secret key somewhere safe and accessible. For
                security reasons,{" "}
                <span className="font-semibold text-neutral-900">
                  you won&apos;t be able to view it again
                </span>
                . If you lose this secret key, you&apos;ll need to generate a
                new one.
              </p>
              <Link
                href="/docs"
                className="mt-4 inline-flex items-center gap-1 text-sm text-neutral-700 underline-offset-2 hover:underline"
              >
                Learn more about API key best practices
                <SquareArrowOutUpRight className="h-3.5 w-3.5" />
              </Link>
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-3 pr-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-neutral-900">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-neutral-950 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className={modalSecondaryButtonClass}
                  onClick={closeCreate}
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-neutral-950">
                Create new secret key
              </h2>
              <FloatingLabelAccountSelect
                label="Project"
                accounts={accounts}
                value={createAccountId}
                onChange={setCreateAccountId}
                loading={accountsLoading}
                disabled={pending}
                containerClassName="mt-4"
              />
              <FloatingLabelInput
                label="Name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                autoComplete="off"
                containerClassName="mt-2"
              />
              {selectedCreateAccount && !canCreateOnSelected ? (
                <p className="mt-3 text-sm text-neutral-500">
                  You need owner or admin access to create keys for this
                  project.
                </p>
              ) : null}
              {error ? (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              ) : null}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className={modalSecondaryButtonClass}
                  onClick={closeCreate}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending || !canCreateOnSelected || accountsLoading}
                  onClick={createKey}
                  className={modalPrimaryButtonClass}
                >
                  {pending ? "Creating…" : "Create secret key"}
                </button>
              </div>
            </>
          )}
        </Modal>
      ) : null}

      {editingId ? (
        <Modal onClose={closeEdit}>
          <h2 className="text-lg font-semibold text-neutral-950">
            Edit secret key
          </h2>
          <FloatingLabelInput
            label="Name"
            value={editingName}
            onChange={(event) => setEditingName(event.target.value)}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveName();
              }
              if (event.key === "Escape") closeEdit();
            }}
            containerClassName="mt-4"
          />
          {error ? (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className={modalSecondaryButtonClass}
              onClick={closeEdit}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !canSaveEdit}
              onClick={saveName}
              className={modalPrimaryButtonClass}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      ) : null}

      {revokeId ? (
        <Modal onClose={() => setRevokeId(null)}>
          <h2 className="text-lg font-semibold text-neutral-950">
            Revoke this key?
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Requests using this secret will stop working immediately. This cannot
            be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className={modalSecondaryButtonClass}
              onClick={() => setRevokeId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => revokeKey(revokeId)}
              className={cn(modalPrimaryButtonClass, "bg-red-600 hover:bg-red-700")}
            >
              {pending ? "Revoking…" : "Revoke key"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

const modalSecondaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50";

const modalPrimaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-kenoo-white p-5 shadow-xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}
