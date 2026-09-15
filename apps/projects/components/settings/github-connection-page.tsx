"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Github } from "lucide-react";

import { useGitHubConnection } from "@/lib/github-connection";

function connectionErrorMessage(error: string) {
  switch (error) {
    case "invalid_oauth_state":
      return "The GitHub connection session expired. Click Continue with GitHub and try again.";
    case "github_installation_cancelled":
      return "GitHub installation was cancelled.";
    case "github_authorization_failed":
      return "GitHub authorization was not completed. Please try again.";
    case "github_not_configured":
      return "GitHub App configuration is not available yet. Please contact your workspace administrator.";
    case "unauthorized":
      return "Sign in to Kenoo again before connecting GitHub.";
    case "no_active_account":
      return "Choose a Kenoo workspace, then connect GitHub again.";
    default:
      return "GitHub did not finish connecting. Please try again.";
  }
}

export function GitHubConnectionPage() {
  const searchParams = useSearchParams();
  const { connection, loading, refetch } = useGitHubConnection();
  const connected = searchParams.get("connected") === "github";
  const error = searchParams.get("error");

  React.useEffect(() => {
    if (connected) void refetch();
  }, [connected, refetch]);

  return (
    <main className="min-h-full w-full bg-kenoo-white px-6 py-8 md:px-10 md:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <div>
          <Link
            href="/settings"
            className="mb-6 inline-flex items-center gap-2 text-sm font-light text-neutral-500 transition-colors hover:text-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Link>
          <header className="flex items-center gap-3">
            <Github className="h-9 w-9 shrink-0" />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                Connection
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                GitHub
              </h1>
            </div>
          </header>
        </div>

        {connected ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            GitHub account connected successfully.
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {connectionErrorMessage(error)}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[28px] bg-white/80 px-4 py-5 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl md:px-6 md:py-6">
          {loading ? (
            <p className="text-sm font-light text-neutral-500">Loading connection…</p>
          ) : connection ? (
            <>
              <p className="font-medium text-foreground">Connected</p>
              <p className="mt-2 text-sm font-light text-neutral-500">
                {connection.token_payload?.account_login ?? "GitHub installation"}
              </p>
              <p className="mt-1 text-xs font-light text-neutral-400">
                Connected {new Date(connection.created_at).toLocaleDateString()}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">Connect account</p>
              <p className="mt-2 text-sm font-light leading-6 text-neutral-500">
                Authorize Projects to access the repositories you choose. You will be redirected to GitHub to select an account and grant the requested repository permissions, so repositories can be linked to projects and technical work.
              </p>

              <ul className="mt-3 space-y-1 text-xs font-light text-neutral-500">
                <li>Contents · Read-only</li>
                <li>Pull requests · Read-only</li>
                <li>Issues · Read-only</li>
                <li>Metadata · Read-only</li>
                <li>Commit statuses · Read-only</li>
              </ul>

              <a
                href="/api/oauth/github/login"
                className="mt-5 inline-flex h-9 items-center justify-center rounded-full border border-neutral-300/80 bg-white/70 px-5 text-sm font-medium tracking-tight text-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-in-out hover:border-neutral-400/80 hover:bg-white/90 active:scale-[0.98]"
              >
                Continue with GitHub
              </a>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
