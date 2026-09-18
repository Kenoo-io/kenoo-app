"use client";

import * as React from "react";
import { Building2, Check, ChevronLeft, Loader2, ShieldCheck, User } from "lucide-react";

import { getSupabaseClient } from "@walls/auth";
import { Button } from "@walls/ui/button";
import { cn } from "@walls/ui/utils";

import { AuthShell } from "@/components/kenoo/auth-shell";

type Account = {
  id: string;
  name: string;
  accountType: "personal" | "organization";
  iconUrl: string | null;
  isDefault: boolean;
};

type AccountResponse = {
  accounts: Account[];
  activeAccountId: string | null;
};

function clientNameFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const requestedName = params.get("client_name")?.trim();
  if (requestedName && requestedName.length <= 80) return requestedName;

  const clientId = params.get("client_id");
  if (clientId) {
    try {
      return new URL(clientId).hostname;
    } catch {
      // A full client display name will come from registered OAuth client metadata.
    }
  }

  return "Your AI assistant";
}

function AccountIcon({ account }: { account: Account }) {
  if (account.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- account icons are user-managed remote URLs
      <img
        alt=""
        src={account.iconUrl}
        className="h-11 w-11 rounded-xl object-cover"
      />
    );
  }

  const Icon = account.accountType === "organization" ? Building2 : User;
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kenoo-subtle text-kenoo-muted">
      <Icon className="h-5 w-5" />
    </span>
  );
}

export default function McpAuthorizePage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [clientName, setClientName] = React.useState("Your AI assistant");
  const [authorizationId, setAuthorizationId] = React.useState<string | null>(null);
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [requestedScopes, setRequestedScopes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewing, setReviewing] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      setClientName(clientNameFromLocation());

      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      const requestedAuthorizationId = new URLSearchParams(window.location.search).get("authorization_id");
      if (!requestedAuthorizationId) {
        setError("This connection request is missing its authorization details. Start the connection again from your AI assistant.");
        setLoading(false);
        return;
      }

      const { data: authorization, error: authorizationError } = await supabase.auth.oauth.getAuthorizationDetails(requestedAuthorizationId);
      if (authorizationError || !authorization) {
        setError("This connection request has expired. Start it again from your AI assistant.");
        setLoading(false);
        return;
      }

      if ("redirect_url" in authorization) {
        window.location.assign(authorization.redirect_url);
        return;
      }

      setAuthorizationId(authorization.authorization_id);
      setClientId(authorization.client.id);
      setClientName(authorization.client.name || clientNameFromLocation());
      setRequestedScopes(authorization.scope.split(" ").filter(Boolean));

      const response = await fetch("/api/accounts");
      if (!response.ok) {
        setError("We couldn't load your Kenoo accounts. Please try again.");
        setLoading(false);
        return;
      }

      const data = (await response.json()) as AccountResponse;
      setAccounts(data.accounts);
      setSelectedAccountId(data.activeAccountId ?? data.accounts[0]?.id ?? null);
      setLoading(false);
    };

    void load();
  }, []);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;

  const approveConnection = async () => {
    if (!authorizationId || !clientId || !selectedAccount) return;

    setError(null);
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session ended. Sign in and start the connection again.");
      return;
    }

    const { error: authorizationWriteError } = await supabase
      .from("account_authorizations")
      .upsert(
        {
          account_id: selectedAccount.id,
          user_id: user.id,
          authorization_server: "supabase",
          client_id: clientId,
          client_name: clientName,
          resource: "mcp",
          scopes: requestedScopes,
          metadata: { clientUri: null },
          revoked_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,authorization_server,client_id,resource" },
      );

    if (authorizationWriteError) {
      setError("We couldn't save the selected account. Please try again.");
      return;
    }

    const { data: approval, error: approvalError } = await supabase.auth.oauth.approveAuthorization(
      authorizationId,
      { skipBrowserRedirect: true },
    );
    if (approvalError || !approval) {
      setError("We couldn't complete the connection. Please try again.");
      return;
    }

    window.location.assign(approval.redirect_url);
  };

  if (loading) {
    return (
      <AuthShell wide>
        <div className="flex min-h-56 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-kenoo-muted" aria-label="Loading accounts" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <main className="mx-auto w-full max-w-xl text-left">
        <div className="rounded-3xl border border-kenoo-border bg-kenoo-surface p-6 shadow-sm sm:p-9">
          {reviewing && selectedAccount ? (
            <section aria-labelledby="mcp-consent-title">
              <button
                type="button"
                onClick={() => setReviewing(false)}
                className="mb-7 inline-flex items-center gap-1.5 text-sm font-medium text-kenoo-muted transition-colors hover:text-kenoo-ink"
              >
                <ChevronLeft className="h-4 w-4" />
                Choose a different account
              </button>

              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-kenoo-subtle text-kenoo-ink">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-medium text-kenoo-muted">Connect to Kenoo</p>
                  <h1 id="mcp-consent-title" className="mt-1 font-display text-3xl font-semibold tracking-[-0.045em] text-kenoo-ink">
                    Allow {clientName} access?
                  </h1>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-kenoo-border bg-kenoo-canvas p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-kenoo-muted">Selected account</p>
                <div className="mt-3 flex items-center gap-3">
                  <AccountIcon account={selectedAccount} />
                  <div>
                    <p className="font-semibold text-kenoo-ink">{selectedAccount.name}</p>
                    <p className="mt-0.5 text-sm text-kenoo-muted">
                      {selectedAccount.accountType === "organization" ? "Organization" : "Personal account"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-sm font-medium text-kenoo-ink">This connection can:</p>
                <ul className="mt-3 space-y-2 text-sm text-kenoo-muted">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-kenoo-ink" /> View projects and account information</li>
                </ul>
              </div>

              {requestedScopes.length ? (
                <p className="mt-4 text-xs text-kenoo-muted">Requested permissions: {requestedScopes.join(", ")}</p>
              ) : null}

              <p className="mt-7 rounded-xl bg-kenoo-subtle px-4 py-3 text-sm leading-6 text-kenoo-muted">
                This client will access only this account. You can review or revoke the connection from Portal at any time.
              </p>

              <Button type="button" className="mt-7 w-full" onClick={() => void approveConnection()}>
                Allow access
              </Button>
            </section>
          ) : (
            <section aria-labelledby="mcp-account-picker-title">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-kenoo-subtle text-kenoo-ink">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-medium text-kenoo-muted">Connect to Kenoo</p>
                  <h1 id="mcp-account-picker-title" className="mt-1 font-display text-3xl font-semibold tracking-[-0.045em] text-kenoo-ink">
                    Choose an account
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-kenoo-muted">
                    Choose the Kenoo account {clientName} can access. This connection will be limited to the account you select.
                  </p>
                </div>
              </div>

              {error ? <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

              {accounts.length ? (
                <div className="mt-8 space-y-2" role="radiogroup" aria-label="Kenoo account">
                  {accounts.map((account) => {
                    const selected = account.id === selectedAccountId;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedAccountId(account.id)}
                        className={cn(
                          "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                          selected
                            ? "border-kenoo-ink bg-kenoo-canvas"
                            : "border-kenoo-border hover:border-kenoo-muted hover:bg-kenoo-canvas",
                        )}
                      >
                        <AccountIcon account={account} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-kenoo-ink">{account.name}</span>
                          <span className="mt-0.5 block text-sm text-kenoo-muted">
                            {account.accountType === "organization" ? "Organization" : "Personal account"}
                          </span>
                        </span>
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-kenoo-ink bg-kenoo-ink text-white" : "border-kenoo-border")}>
                          {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-8 rounded-2xl bg-kenoo-subtle px-4 py-5 text-sm leading-6 text-kenoo-muted">
                  You don&apos;t have a Kenoo account available to connect yet.
                </p>
              )}

              <Button
                type="button"
                className="mt-7 w-full"
                disabled={!selectedAccount}
                onClick={() => setReviewing(true)}
              >
                Continue
              </Button>
            </section>
          )}
        </div>
      </main>
    </AuthShell>
  );
}
