"use client";

import * as React from "react";
import { Bot, Building2, Check, ChevronDown, Loader2, User } from "lucide-react";

import { getSupabaseClient } from "@walls/auth";
import { Button } from "@walls/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
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

const KNOWN_CLIENT_LOGOS = [
  { matches: /chatgpt|openai/i, name: "OpenAI", src: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" },
  { matches: /claude|anthropic/i, name: "Claude", src: "https://cdn.simpleicons.org/claude/ffffff" },
  { matches: /cursor/i, name: "Cursor", src: "https://cdn.simpleicons.org/cursor/111111" },
] as const;

const PREVIEW_CLIENTS = ["ChatGPT", "Claude", "Cursor"] as const;

function isClaudeClient(clientName: string) {
  return /claude|anthropic/i.test(clientName);
}

function isCursorClient(clientName: string) {
  return /cursor/i.test(clientName);
}

function ClientLogo({ clientName, compact = false }: { clientName: string; compact?: boolean }) {
  const [failed, setFailed] = React.useState(false);
  const client = KNOWN_CLIENT_LOGOS.find((knownClient) => knownClient.matches.test(clientName));

  if (!client || failed) return <Bot className="h-7 w-7" strokeWidth={1.7} aria-label="AI assistant" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- known public brand mark, selected from a fixed allowlist
    <img
      src={client.src}
      alt={`${client.name} logo`}
      className={cn(
        "h-full w-full rounded-2xl",
        isClaudeClient(clientName)
          ? (compact ? "object-contain p-0.5" : "object-contain p-2")
          : isCursorClient(clientName)
            ? (compact ? "object-contain p-0.5" : "object-contain p-1.5")
            : "object-cover",
      )}
      onError={() => setFailed(true)}
    />
  );
}

function McpAccountSelector({
  accounts,
  selectedAccountId,
  onAccountChange,
}: {
  accounts: Account[];
  selectedAccountId: string | null;
  onAccountChange: (accountId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0];

  if (!selectedAccount) return null;

  const AccountGlyph = selectedAccount.accountType === "organization" ? Building2 : User;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "mt-2 flex h-10 w-full items-center gap-2.5 rounded-lg border border-neutral-200 bg-[var(--kenoo-white)] px-3 text-left shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)] transition",
            "hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kenoo-ink/10",
            open && "border-neutral-300 bg-neutral-50",
          )}
        >
          {selectedAccount.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- account icons are user-managed remote URLs
            <img src={selectedAccount.iconUrl} alt="" className="h-6 w-6 rounded-md object-cover" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
              <AccountGlyph className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-kenoo-ink">{selectedAccount.name}</span>
          <span className="text-xs text-kenoo-muted">{selectedAccount.accountType === "organization" ? "Organization" : "Personal"}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform", open && "rotate-180")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="z-[110] w-[min(100vw-3rem,320px)] rounded-xl border-0 bg-[var(--kenoo-white)] p-1.5 shadow-xl">
        <p className="px-2 py-1 text-xs font-medium text-neutral-500">Choose an account</p>
        {accounts.map((account) => {
          const isSelected = account.id === selectedAccount.id;
          const Icon = account.accountType === "organization" ? Building2 : User;
          return (
            <DropdownMenuItem
              key={account.id}
              onSelect={(event) => {
                event.preventDefault();
                onAccountChange(account.id);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer rounded-lg px-2 py-2 focus:bg-transparent",
                isSelected ? "bg-neutral-100" : "hover:bg-neutral-50",
              )}
            >
              {account.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- account icons are user-managed remote URLs
                <img src={account.iconUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-kenoo-ink">{account.name}</span>
                <span className="block text-[11px] text-kenoo-muted">{account.accountType === "organization" ? "Organization" : "Personal"}</span>
              </span>
              {isSelected ? <Check className="h-3.5 w-3.5 text-kenoo-ink" strokeWidth={2.75} /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

export default function McpAuthorizePage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [clientName, setClientName] = React.useState("Your AI assistant");
  const [authorizationId, setAuthorizationId] = React.useState<string | null>(null);
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [requestedScopes, setRequestedScopes] = React.useState<string[]>([]);
  const [showFullPermissions, setShowFullPermissions] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [authorizing, setAuthorizing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [previewClient, setPreviewClient] = React.useState<(typeof PREVIEW_CLIENTS)[number]>("ChatGPT");

  React.useEffect(() => {
    const load = async () => {
      setClientName(clientNameFromLocation());

      const params = new URLSearchParams(window.location.search);
      // Preview is deliberately limited to local development. It uses the signed-in
      // user's real account list but never creates an OAuth authorization.
      const isLocalPreview =
        params.get("preview") === "1" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      setPreviewMode(isLocalPreview);

      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      const loadAccounts = async () => {
        const response = await fetch("/api/accounts");
        if (!response.ok) {
          setError("We couldn't load your Kenoo accounts. Please try again.");
          setLoading(false);
          return false;
        }

        const data = (await response.json()) as AccountResponse;
        setAccounts(data.accounts);
        setSelectedAccountId(data.activeAccountId ?? data.accounts[0]?.id ?? null);
        return true;
      };

      if (isLocalPreview) {
        setClientName("ChatGPT");
        await loadAccounts();
        setLoading(false);
        return;
      }

      const requestedAuthorizationId = params.get("authorization_id");
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

      await loadAccounts();
      setLoading(false);
    };

    void load();
  }, []);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const displayClientName = previewMode ? previewClient : clientName;

  React.useEffect(() => {
    document.title = `Authorize ${displayClientName}`;
  }, [displayClientName]);

  const approveConnection = async () => {
    if (previewMode) {
      setAuthorizing(true);
      window.setTimeout(() => setAuthorizing(false), 1000);
      return;
    }

    if (!authorizationId || !clientId || !selectedAccount) return;

    setAuthorizing(true);
    setError(null);
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session ended. Sign in and start the connection again.");
      setAuthorizing(false);
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
      setAuthorizing(false);
      return;
    }

    const { data: approval, error: approvalError } = await supabase.auth.oauth.approveAuthorization(
      authorizationId,
      { skipBrowserRedirect: true },
    );
    if (approvalError || !approval) {
      setError("We couldn't complete the connection. Please try again.");
      setAuthorizing(false);
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
    <AuthShell
      background={
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 55% 45% at 8% 72%, rgba(11,110,255,0.16), transparent 58%), radial-gradient(ellipse 50% 40% at 92% 28%, rgba(91,184,168,0.16), transparent 55%), radial-gradient(ellipse 40% 30% at 50% 100%, rgba(17,17,17,0.04), transparent 50%), linear-gradient(180deg, #f4f5f4 0%, #fbfbfb 50%, #f1f2f1 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.28]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
            }}
          />
        </>
      }
    >
      <main className="w-full text-left">
        <div className="rounded-2xl border border-neutral-200/90 bg-[var(--kenoo-white)] px-6 py-8 shadow-[0_8px_28px_rgba(15,23,42,0.07)] transition-shadow duration-200 hover:shadow-[0_10px_32px_rgba(15,23,42,0.1)] sm:px-8 sm:py-9">
          <section aria-labelledby="mcp-authorize-title">
            <div className="flex items-center justify-center gap-2.5">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200/90 bg-[var(--kenoo-white)] shadow-[0_4px_14px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- portal's local app icon */}
                <img src="/icon.png" alt="Kenoo" className="h-full w-full rounded-2xl object-cover" />
              </span>
              <span className="text-xl text-kenoo-muted" aria-hidden>↔</span>
              <span className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl border text-kenoo-ink",
                isClaudeClient(displayClientName)
                  ? "border-[#c96f55] bg-[#d97757] shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                  : "border-neutral-200/90 bg-[var(--kenoo-white)] shadow-[0_4px_14px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]",
              )}>
                <ClientLogo clientName={displayClientName} />
              </span>
            </div>

            <h1 id="mcp-authorize-title" className="mt-6 text-center font-display text-xl font-semibold tracking-[-0.04em] text-kenoo-ink">
              Authorize {displayClientName}
            </h1>
            <p className="mx-auto mt-1.5 max-w-xs text-center text-[13px] leading-5 text-kenoo-muted">
              {displayClientName} wants to access your selected Kenoo account.
            </p>

            {error ? <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-kenoo-muted">
                Account
              </p>
              {accounts.length ? (
                <McpAccountSelector
                  accounts={accounts}
                  selectedAccountId={selectedAccountId}
                  onAccountChange={setSelectedAccountId}
                />
              ) : (
                <p className="mt-2 rounded-lg border border-neutral-200 bg-[var(--kenoo-white)] px-3 py-3 text-sm leading-5 text-kenoo-muted">
                  You don&apos;t have a Kenoo account available to connect yet.
                </p>
              )}
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-kenoo-muted">Permissions</p>
              <p className="mt-2 text-[12px] leading-[1.15rem] text-kenoo-muted">
                Authorizing {displayClientName} grants access to the following data for this account. Only continue if you trust this app.
              </p>
              <div className="mt-4 rounded-xl border border-neutral-200/90 bg-neutral-100 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-kenoo-ink">Kenoo account, projects, and AdPilot</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#f1d56a] bg-[#fff7d6] px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[#806400]">READ &amp; WRITE</span>
                </div>
                <button
                  type="button"
                  aria-expanded={showFullPermissions}
                  aria-controls="mcp-full-permissions"
                  onClick={() => setShowFullPermissions((shown) => !shown)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-kenoo-muted transition hover:text-kenoo-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-kenoo-ink/20"
                >
                  {showFullPermissions ? "Show less" : "Show full permissions"}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showFullPermissions && "rotate-180")} />
                </button>
                {showFullPermissions ? (
                  <div id="mcp-full-permissions" className="mt-3 space-y-3 border-t border-neutral-200 pt-3 text-xs leading-5 text-kenoo-muted">
                    <div>
                      <p className="font-semibold text-kenoo-ink">Read</p>
                      <p>View the selected account, accessible projects and tasks, campaigns, ad sets, ads, advertising performance, audience breakdowns, saturation data, and AdPilot automation profiles and settings.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-kenoo-ink">Write</p>
                      <p>Create projects and tasks. Enable or disable AdPilot automation, choose a rule profile, and update supported automation settings for campaigns and ad sets. Activate or pause individual ads on their connected Meta or Google Ads account.</p>
                    </div>
                    {requestedScopes.length ? (
                      <p className="border-t border-neutral-200 pt-3">OAuth scopes: {requestedScopes.join(", ")}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <Button type="button" className="mt-8 w-full bg-black text-white shadow-[0_4px_14px_rgba(0,0,0,0.16)] hover:bg-black/90" disabled={!selectedAccount || authorizing} onClick={() => void approveConnection()}>
              {authorizing ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Authorizing" /> : `Authorize ${displayClientName}`}
            </Button>
            <button type="button" onClick={() => window.history.back()} className="mt-3 w-full text-center text-sm font-medium text-kenoo-muted transition hover:text-kenoo-ink">
              Cancel
            </button>
          </section>
        </div>
        {previewMode ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-xs font-medium text-kenoo-muted">Preview as</span>
            <div className="inline-flex rounded-full border border-white/70 bg-white/60 p-1 shadow-[0_4px_14px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              {PREVIEW_CLIENTS.map((client) => {
                const selected = previewClient === client;
                return (
                  <button
                    key={client}
                    type="button"
                    onClick={() => setPreviewClient(client)}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition",
                      selected ? "bg-[var(--kenoo-white)] text-kenoo-ink shadow-sm" : "text-kenoo-muted hover:text-kenoo-ink",
                    )}
                  >
                    <span className={cn("flex h-4 w-4 items-center justify-center overflow-hidden rounded-full", isClaudeClient(client) && "bg-[#d97757]")}>
                      <ClientLogo clientName={client} compact />
                    </span>
                    {client}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </main>
    </AuthShell>
  );
}
