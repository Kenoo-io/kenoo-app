"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Info, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { FloatingLabelInput } from "./floating-label-fields";
import {
  canManageFlowKeys,
  FloatingLabelAccountSelect,
  type FlowAccount,
} from "./floating-label-account-select";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function maskPrefix(prefix: string) {
  return `${prefix}••••••••`;
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showRevoked, setShowRevoked] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [editingName, setEditingName] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<FlowAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [createAccountId, setCreateAccountId] = useState<string | null>(null);
  const [reloadOnClose, setReloadOnClose] = useState(false);

  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;
    void fetch("/api/accounts")
      .then(async (response) => {
        const payload = (await response.json()) as { accounts?: FlowAccount[]; activeAccountId?: string | null };
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
    return () => { cancelled = true; };
  }, [createOpen]);

  const selectedCreateAccount = accounts.find((account) => account.id === createAccountId) ?? accounts[0] ?? null;
  const canCreateOnSelected = canManageFlowKeys(selectedCreateAccount) && selectedCreateAccount?.hasAppAccess !== false;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/keys")
      .then(async (response) => {
        const payload = (await response.json()) as { keys?: ApiKey[]; canManage?: boolean; error?: string };
        if (cancelled) return;
        if (!response.ok) throw new Error(payload.error || "Unable to load API keys");
        setKeys(payload.keys ?? []);
        setCanManage(Boolean(payload.canManage));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load API keys");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return keys.filter((key) => {
      if (!showRevoked && key.revoked_at) return false;
      if (!needle) return true;
      return `${key.name} ${key.key_prefix}`.toLowerCase().includes(needle);
    });
  }, [keys, query, showRevoked]);

  async function createKey() {
    if (!selectedCreateAccount || !canCreateOnSelected) return;
    setPending(true);
    setError(null);
    const switched = selectedCreateAccount.id !== activeAccountId;
    try {
      if (switched) {
        const switchResponse = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: selectedCreateAccount.id }) });
        if (!switchResponse.ok) throw new Error("Failed to switch project");
        setActiveAccountId(selectedCreateAccount.id);
        setReloadOnClose(true);
      }
      const response = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: createName.trim() || "Flows event key" }) });
      const payload = (await response.json()) as { key?: ApiKey; secret?: string; error?: string };
      if (!response.ok || !payload.key || !payload.secret) throw new Error(payload.error || "Unable to create API key");
      setKeys((current) => [payload.key!, ...current]);
      setSecret(payload.secret);
      setCreateName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create API key");
    } finally {
      setPending(false);
    }
  }

  async function saveName() {
    if (!editing) return;
    setPending(true);
    try {
      const response = await fetch(`/api/keys/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingName.trim() }) });
      const payload = (await response.json()) as { key?: { id: string; name: string }; error?: string };
      if (!response.ok || !payload.key) throw new Error(payload.error || "Unable to rename API key");
      setKeys((current) => current.map((key) => key.id === editing.id ? { ...key, name: payload.key!.name } : key));
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to rename API key");
    } finally {
      setPending(false);
    }
  }

  async function revokeKey() {
    if (!revokeId) return;
    setPending(true);
    try {
      const response = await fetch(`/api/keys/${revokeId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to revoke API key");
      setKeys((current) => current.map((key) => key.id === revokeId ? { ...key, revoked_at: new Date().toISOString() } : key));
      setRevokeId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to revoke API key");
    } finally {
      setPending(false);
    }
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard?.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function closeCreate() {
    const shouldReload = reloadOnClose;
    setCreateOpen(false);
    setSecret(null);
    setCreateName("");
    setCopied(false);
    setCreateAccountId(null);
    setReloadOnClose(false);
    if (shouldReload) window.location.reload();
  }

  return (
    <main className="min-h-full w-full bg-kenoo-white px-6 pb-12 pt-6 md:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-3xl font-semibold tracking-tight text-foreground">API keys</h1></div>
          {canManage ? <button type="button" onClick={() => { setAccountsLoading(true); setCreateOpen(true); setError(null); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"><Plus className="h-4 w-4" /> Create new secret key</button> : null}
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search keys..." className="h-9 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-800 outline-none focus:border-neutral-400" /></div><button type="button" onClick={() => setShowRevoked((value) => !value)} className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full px-3 text-sm text-neutral-600 transition hover:bg-neutral-100">{showRevoked ? <Check className="h-3.5 w-3.5" /> : null}{showRevoked ? "Showing revoked" : "Active keys"}</button></div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="border-b border-neutral-200 text-[13px] text-neutral-400"><th className="py-3 pr-6 font-normal">Name</th><th className="py-3 pr-6 font-normal">Status</th><th className="py-3 pr-6 font-normal">Secret key</th><th className="py-3 pr-6 font-normal">Created</th><th className="py-3 pr-6 font-normal"><span className="inline-flex items-center gap-1">Last used <Info className="h-3.5 w-3.5" /></span></th><th className="py-3 font-normal" /></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="py-16 text-center text-sm text-neutral-500">Loading keys…</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-sm text-neutral-500">{keys.length === 0 ? "No Flows keys yet." : "No keys match this search."}</td></tr> : filtered.map((key) => <tr key={key.id} className="border-b border-neutral-100 last:border-0"><td className="py-4 pr-6 font-medium text-neutral-900">{key.name}</td><td className="py-4 pr-6 text-neutral-700">{key.revoked_at ? "Revoked" : "Active"}</td><td className="py-4 pr-6 font-mono text-[13px] text-neutral-600">{maskPrefix(key.key_prefix)}</td><td className="whitespace-nowrap py-4 pr-6 text-neutral-700">{formatDate(key.created_at)}</td><td className="whitespace-nowrap py-4 pr-6 text-neutral-700">{formatDate(key.last_used_at)}</td><td className="py-4"><div className="flex justify-end gap-1">{canManage && !key.revoked_at ? <><button type="button" onClick={() => { setEditing(key); setEditingName(key.name); setError(null); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700" aria-label={`Rename ${key.name}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => { setRevokeId(key.id); setError(null); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50" aria-label={`Revoke ${key.name}`}><Trash2 className="h-4 w-4" /></button></> : null}</div></td></tr>)}</tbody></table></div>
      </div>

      {(createOpen || editing || revokeId) ? <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"><button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={() => { if (!pending) { closeCreate(); setEditing(null); setRevokeId(null); } }} /><div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-kenoo-white p-5 shadow-xl">{secret ? <><h2 className="text-lg font-semibold text-neutral-950">Save your key</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Please save this secret key somewhere safe and accessible. For security reasons, <span className="font-semibold text-neutral-900">you won&apos;t be able to view it again</span>. If you lose this secret key, you&apos;ll need to generate a new one.</p><div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-3 pr-2"><code className="min-w-0 flex-1 truncate font-mono text-[13px] text-neutral-900">{secret}</code><button type="button" onClick={() => void copySecret()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-neutral-950 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button></div><div className="mt-6 flex justify-end"><button type="button" onClick={closeCreate} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200">Done</button></div></> : editing ? <><h2 className="text-lg font-semibold text-neutral-950">Rename API key</h2><input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveName(); }} className="mt-4 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400" /><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="h-10 rounded-lg bg-neutral-100 px-4 text-sm font-medium">Cancel</button><button type="button" disabled={pending || !editingName.trim()} onClick={() => void saveName()} className="h-10 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button></div></> : revokeId ? <><h2 className="text-lg font-semibold text-neutral-950">Revoke this key?</h2><p className="mt-2 text-sm leading-6 text-neutral-500">Requests using this key will stop working immediately. This cannot be undone.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setRevokeId(null)} className="h-10 rounded-lg bg-neutral-100 px-4 text-sm font-medium">Cancel</button><button type="button" disabled={pending} onClick={() => void revokeKey()} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50">{pending ? "Revoking…" : "Revoke key"}</button></div></> : <><h2 className="text-lg font-semibold text-neutral-950">Create new secret key</h2><FloatingLabelAccountSelect accounts={accounts} value={createAccountId} onChange={setCreateAccountId} loading={accountsLoading} disabled={pending} /><FloatingLabelInput autoFocus label="Key name" value={createName} onChange={(event) => setCreateName(event.target.value)} autoComplete="off" className="mt-2" />{selectedCreateAccount && !canCreateOnSelected ? <p className="mt-3 text-sm text-neutral-500">You need owner or admin access to create keys for this project.</p> : null}{error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={closeCreate} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200">Cancel</button><button type="button" disabled={pending || !canCreateOnSelected || accountsLoading} onClick={() => void createKey()} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Creating…" : "Create secret key"}</button></div></>}</div></div> : null}
    </main>
  );
}
