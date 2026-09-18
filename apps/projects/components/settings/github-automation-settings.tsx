"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type GitHubRepository = { full_name: string; default_branch: string; html_url: string };
type RepositoryAutomation = {
  repository_full_name: string;
  completion_mode: "merge" | "deployment";
  completion_branch: string | null;
  deployment_environment: string | null;
};

type SelectOption = { value: string; label: string };

function AutomationSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value) ?? { value, label: value };

  return (
    <div className="pt-2">
      <div className="relative w-full max-w-sm">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-12 w-full items-center gap-2 rounded-2xl border border-black/[0.10] bg-white/55 px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:bg-white/80",
                "outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                open && "border-[var(--kenoo-sky)] bg-white/80",
              )}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-light text-foreground">{selected.label}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform", open && "rotate-180")} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="z-[200] w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl border-0 bg-white/90 p-2 font-light shadow-xl backdrop-blur-xl">
            <div className="space-y-0.5">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={(event) => {
                      event.preventDefault();
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn("cursor-pointer rounded-xl px-3 py-2.5 transition-colors focus:bg-transparent", active ? "bg-neutral-100" : "hover:bg-neutral-50")}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-light text-foreground">{option.label}</span>
                    {active ? <Check className="h-4 w-4 shrink-0 text-foreground" strokeWidth={2.75} /> : null}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className={cn("pointer-events-none absolute left-3 top-0 flex origin-left items-center bg-kenoo-white px-1.5 text-sm font-light leading-none", open ? "text-[var(--kenoo-sky)]" : "text-[#737373]")} style={{ transform: "translateY(-50%) scale(0.78)" }}>{label}</span>
      </div>
    </div>
  );
}

function AutomationFloatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = React.useId();
  const floated = focused || value.length > 0;

  return (
    <div className="pt-2">
      <div className="relative w-full max-w-sm">
        <motion.input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="h-12 w-full rounded-2xl border border-black/[0.10] bg-white/55 px-4 text-sm font-light leading-none text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl outline-none placeholder:text-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-0"
          initial={false}
          animate={{ borderColor: focused ? "var(--kenoo-sky)" : "#e5e5e5" }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <motion.label
          htmlFor={inputId}
          className={cn("absolute left-3 flex origin-left cursor-text items-center px-1.5 font-light", floated ? "bg-kenoo-white" : "bg-transparent")}
          initial={false}
          animate={{
            top: floated ? 0 : "50%",
            y: "-50%",
            scale: floated ? 0.78 : 1,
            color: focused ? "var(--kenoo-sky)" : floated ? "#737373" : "#a3a3a3",
          }}
          transition={{
            top: { type: "spring", stiffness: 420, damping: 32, mass: 0.6 },
            y: { type: "spring", stiffness: 420, damping: 32, mass: 0.6 },
            scale: { type: "spring", stiffness: 420, damping: 32, mass: 0.6 },
            color: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
          }}
        >
          <span className="text-sm leading-none">{label}</span>
        </motion.label>
      </div>
    </div>
  );
}

export function GitHubAutomationSettings({ connectionId }: { connectionId: string }) {
  const [repositories, setRepositories] = React.useState<GitHubRepository[]>([]);
  const [automations, setAutomations] = React.useState<RepositoryAutomation[]>([]);
  const [selectedRepository, setSelectedRepository] = React.useState("");
  const [branches, setBranches] = React.useState<string[]>([]);
  const [completionMode, setCompletionMode] = React.useState<"merge" | "deployment">("merge");
  const [completionBranch, setCompletionBranch] = React.useState("main");
  const [deploymentEnvironment, setDeploymentEnvironment] = React.useState("production");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const selectedRepositoryDetails = repositories.find((repository) => repository.full_name === selectedRepository);

  const selectRepository = React.useCallback((repository: string, available: GitHubRepository[], settings: RepositoryAutomation[]) => {
    const automation = settings.find((item) => item.repository_full_name === repository);
    setSelectedRepository(repository);
    setCompletionMode(automation?.completion_mode ?? "merge");
    setCompletionBranch(automation?.completion_branch ?? "main");
    setDeploymentEnvironment(automation?.deployment_environment ?? "production");
    if (!automation && !available.some((item) => item.full_name === repository)) setError("Repository is unavailable.");
  }, []);

  React.useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/tasks/github/repositories", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Unable to load GitHub repositories");
        return response.json() as Promise<{ repositories: GitHubRepository[] }>;
      }),
      fetch("/api/connections/github/automation", { cache: "no-store" }).then(async (response) => {
        const payload = await response.json() as { automations?: RepositoryAutomation[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Unable to load completion settings");
        return { automations: payload.automations ?? [] };
      }),
    ]).then(([repositoryData, automationData]) => {
      if (!active) return;
      setRepositories(repositoryData.repositories);
      setAutomations(automationData.automations);
      if (repositoryData.repositories[0]) selectRepository(repositoryData.repositories[0].full_name, repositoryData.repositories, automationData.automations);
    }).catch(async (cause: unknown) => {
      // Repositories are fetched from the existing task-branch endpoint. Keep
      // showing them even when the new automation-settings migration has not
      // yet been applied.
      try {
        const response = await fetch("/api/tasks/github/repositories", { cache: "no-store" });
        const repositoryData = await response.json() as { repositories?: GitHubRepository[] };
        if (active && response.ok && repositoryData.repositories) {
          setRepositories(repositoryData.repositories);
          if (repositoryData.repositories[0]) selectRepository(repositoryData.repositories[0].full_name, repositoryData.repositories, []);
        }
      } catch {
        // The original error below is more useful than a second fetch failure.
      }
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load completion settings");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [connectionId, selectRepository]);

  React.useEffect(() => {
    if (!selectedRepository) return;
    let active = true;
    void fetch(`/api/tasks/github/repositories?repository=${encodeURIComponent(selectedRepository)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load repository branches");
        return response.json() as Promise<{ branches: string[] }>;
      })
      .then((data) => { if (active) setBranches(data.branches); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load repository branches"); });
    return () => { active = false; };
  }, [selectedRepository]);

  async function save() {
    if (!selectedRepository) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/github/automation", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository: selectedRepository, completionMode, completionBranch, deploymentEnvironment }),
      });
      const payload = await response.json() as { automation?: RepositoryAutomation; error?: string };
      if (!response.ok || !payload.automation) throw new Error(payload.error || "Unable to save completion settings");
      setAutomations((current) => [...current.filter((item) => item.repository_full_name !== selectedRepository), payload.automation!]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save completion settings");
    } finally { setSaving(false); }
  }

  return (
    <section className="overflow-hidden rounded-[28px] bg-white/80 px-4 py-5 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl md:px-6 md:py-6">
      {loading ? <p className="mt-5 text-sm font-light text-neutral-500">Loading repositories…</p> : repositories.length === 0 ? <p className="mt-5 text-sm font-light text-neutral-500">No repositories are available to this GitHub installation.</p> : (
        <div className="space-y-6">
          <AutomationSelect label="Repository" value={selectedRepository} options={repositories.map((repository) => ({ value: repository.full_name, label: repository.full_name }))} onChange={(repository) => selectRepository(repository, repositories, automations)} />
          <div>
            <p className="font-medium text-foreground">Task completion automation</p>
            <p className="mt-2 max-w-xl text-sm font-light leading-6 text-neutral-500">Choose when linked tasks are marked Complete for this repository.</p>
          </div>
          <AutomationSelect label="Mark linked tasks Complete when" value={completionMode} options={[{ value: "merge", label: "A pull request is merged into a branch" }, { value: "deployment", label: "A deployment succeeds in an environment" }]} onChange={(mode) => setCompletionMode(mode as "merge" | "deployment")} />
          {completionMode === "merge" ? (
            <div>
              <AutomationSelect label="Completion branch" value={completionBranch} options={[...(!branches.includes(completionBranch) ? [{ value: completionBranch, label: completionBranch }] : []), ...branches.map((branch) => ({ value: branch, label: branch }))]} onChange={setCompletionBranch} />
            </div>
          ) : (
            <div className="block text-sm font-medium text-foreground">
              <AutomationFloatingInput label="Deployment environment" value={deploymentEnvironment} onChange={setDeploymentEnvironment} />
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" className="mt-2 text-xs font-medium text-[var(--kenoo-sky)] outline-none hover:underline focus:outline-none focus-visible:outline-none focus-visible:ring-0">How to find this</button>
                </DialogTrigger>
                <DialogContent className="z-[120] w-[calc(100vw-2rem)] max-w-md gap-0 rounded-[28px] p-6" overlayClassName="z-[120] bg-black/20 backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle>Find the environment name in GitHub</DialogTitle>
                  </DialogHeader>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs font-light leading-5 text-neutral-600">
                    <li>
                      Open{" "}
                      <a href={selectedRepositoryDetails?.html_url ?? `https://github.com/${selectedRepository}`} target="_blank" rel="noreferrer" className="font-medium text-[var(--kenoo-sky)] hover:underline">
                        {selectedRepository || "the repository"}
                      </a>{" "}
                      in GitHub.
                    </li>
                    <li>Open <span className="font-medium text-foreground">Actions</span> and select a recent successful deployment.</li>
                    <li>Use the environment name shown there, such as <span className="font-medium text-foreground">production</span> or <span className="font-medium text-foreground">staging</span>.</li>
                  </ol>
                </DialogContent>
              </Dialog>
            </div>
          )}
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            {saving ? "Saving…" : "Save automation"}
          </Button>
        </div>
      )}
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
