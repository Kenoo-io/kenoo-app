"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getSupabaseClient } from "@walls/auth";
import { useAuth } from "@walls/auth";
import { Check, ChevronDown, ExternalLink, GitBranch, Github, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Project,
  ProjectTask,
  TaskStatus,
  TASK_STATUS_CONFIG,
  KANBAN_COLUMNS,
  PRIORITY_CONFIG,
  PROJECT_STATUS_CONFIG,
  TASK_BOARD_PROJECT_STATUSES,
} from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MiniDatePicker } from "@/components/ui/mini-date-picker";
import { SequenceSwitch as Switch } from "@/components/ui/sequence-switch";
import { AnimatePresence, motion } from "framer-motion";
import { format, isValid, parseISO } from "date-fns";
import { AgentSearch } from "@/components/ui/searches/agent-search";
import { SimpleMarkdownEditor } from "@/components/agents-projects/simple-markdown-editor";
import {
  notifyTaskAssignee,
  sendTaskAssignmentEmail,
  sendTaskBlockerCompletedEmail,
  resolveActorDisplayName,
} from "@/lib/user-notifications";
import { useActiveAccount } from "@/components/active-account-context";
import { loadAccessibleProjects as fetchAccessibleProjects } from "./load-accessible-projects";
import {
  getTaskAssigneeIds,
  syncProjectTaskAssignees,
} from "./task-assignee";

/* ─── Form config ────────────────────────────────────────────────────────── */
const popupButtonOuterClass =
  "w-10 h-10 p-0 text-slate-600 hover:bg-transparent flex items-center justify-center shadow-none relative group flex-shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
const popupButtonInnerClass =
  "relative z-10 p-3 rounded-full transition-all duration-300 ease-in-out group-hover:bg-neutral-100";
const modalSecondaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50";
const modalPrimaryButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";
const fieldLabelClass =
  "text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
const fieldValueClass = "truncate text-[15px] font-light text-neutral-900";
const fieldPlaceholderClass = "text-neutral-300";

interface TaskFormState {
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string;
  priority: string;
  project_id: string;
  assignee_ids: string[];
  blocker_task_ids: string[];
  /** When true (default), task is public (is_private = false). */
  is_public: boolean;
}

type TaskPanelTab = "basics" | "schedule" | "settings";

const EMPTY_TASK_FORM: TaskFormState = {
  title: "",
  description: "",
  status: "todo",
  due_date: "",
  priority: "3",
  project_id: "",
  assignee_ids: [],
  blocker_task_ids: [],
  is_public: true,
};

type TaskBlockerOption = Pick<ProjectTask, "id" | "project_id" | "status" | "title">;

function projectSwatchColor(project: Project): string {
  return (
    project.color ??
    PROJECT_STATUS_CONFIG[project.status]?.accent ??
    "rgb(163 163 163)"
  );
}

/** Ensures the project owner is always included in the member list. */
function withOwnerAsMember(
  memberIds: string[],
  ownerId: string | null | undefined
): string[] {
  if (!ownerId) return memberIds;
  if (memberIds.includes(ownerId)) return memberIds;
  return [ownerId, ...memberIds];
}

/** Set when any assignee is someone other than the actor; null for self-only or none. */
function resolveAssignedBy(
  assigneeIds: string[],
  actorUserId: string | null
): string | null {
  if (!actorUserId || assigneeIds.length === 0) return null;
  if (assigneeIds.every((id) => id === actorUserId)) return null;
  return actorUserId;
}

function toggleAssigneeId(ids: string[], agentId: string): string[] {
  return ids.includes(agentId)
    ? ids.filter((id) => id !== agentId)
    : [...ids, agentId];
}

/* ─── Props ───────────────────────────────────────────────────────────────── */
export interface CreateTasksPopupProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  projects: Project[];
  defaultStatus?: TaskStatus;
  threadId?: string | null;
  defaultProjectId?: string | null;
  existing?: ProjectTask | null;
}

type LinkedBranch = { repository_full_name: string; branch_name: string; branch_deleted_at?: string | null };
type GitHubRepository = { full_name: string; default_branch: string };
type TimedCacheEntry<T> = { value: T; expiresAt: number };

const GITHUB_CACHE_TTL_MS = 5 * 60 * 1000;
const taskBranchCache = new Map<string, TimedCacheEntry<LinkedBranch | null>>();
let repositoriesCache: TimedCacheEntry<GitHubRepository[]> | null = null;

function getCachedValue<T>(entry: TimedCacheEntry<T> | null | undefined): T | null {
  return entry && entry.expiresAt > Date.now() ? entry.value : null;
}

async function loadTaskBranch(taskId: string): Promise<LinkedBranch | null> {
  const cached = taskBranchCache.get(taskId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetch(`/api/tasks/github/branch?taskId=${encodeURIComponent(taskId)}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to load the linked GitHub branch.");
  const branch = (result.branch as LinkedBranch | null) ?? null;
  taskBranchCache.set(taskId, { value: branch, expiresAt: Date.now() + GITHUB_CACHE_TTL_MS });
  return branch;
}

async function loadGitHubRepositories(): Promise<GitHubRepository[]> {
  const cached = getCachedValue(repositoriesCache);
  if (cached) return cached;
  const response = await fetch("/api/tasks/github/repositories");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to load GitHub connection.");
  const repositories = (result.repositories ?? []) as GitHubRepository[];
  repositoriesCache = { value: repositories, expiresAt: Date.now() + GITHUB_CACHE_TTL_MS };
  return repositories;
}

function TaskBranchField({ task, disabled, open }: { task: ProjectTask; disabled: boolean; open: boolean }) {
  const [branch, setBranch] = useState<LinkedBranch | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [repository, setRepository] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedBranchTaskId, setLoadedBranchTaskId] = useState<string | null>(null);
  const [loadingRepositories, setLoadingRepositories] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [removingBranch, setRemovingBranch] = useState(false);
  const [confirmingBranchRemoval, setConfirmingBranchRemoval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadedBranchTaskId(null);
    loadTaskBranch(task.id)
      .then((linkedBranch) => {
        if (cancelled) return;
        setBranch(linkedBranch);
        setError(null);
        setLoadedBranchTaskId(task.id);
      })
      .catch(() => !cancelled && setError("Unable to load the linked GitHub branch."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [task.id, open]);

  useEffect(() => {
    if (!open || loading || loadedBranchTaskId !== task.id || branch || repositories.length) return;
    let cancelled = false;
    setLoadingRepositories(true);
    loadGitHubRepositories().then((available) => {
      if (cancelled) return;
      setRepositories(available);
      if (available[0]) { setRepository(available[0].full_name); setBaseBranch(available[0].default_branch); }
    }).catch(() => !cancelled && setError("Unable to load GitHub connection.")).finally(() => {
      if (!cancelled) setLoadingRepositories(false);
    });
    return () => { cancelled = true; };
  }, [open, loading, loadedBranchTaskId, task.id, branch, repositories.length]);

  useEffect(() => {
    if (!setupOpen || !repository || branch) return;
    let cancelled = false;
    fetch(`/api/tasks/github/repositories?repository=${encodeURIComponent(repository)}`).then((r) => r.json()).then((result) => {
      if (cancelled) return;
      const available = (result.branches ?? []) as string[];
      setBranches(available);
      setBaseBranch((current) => available.includes(current) ? current : (result.selected?.baseBranch ?? available[0] ?? current));
    }).catch(() => !cancelled && setError("Unable to load repository branches."));
    return () => { cancelled = true; };
  }, [setupOpen, repository, branch]);

  const createBranch = async () => {
    if (!repository || !baseBranch) return;
    setCreating(true); setError(null);
    try {
      const response = await fetch("/api/tasks/github/branch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, repository, baseBranch }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create branch.");
      setBranch(result.branch as LinkedBranch);
      taskBranchCache.set(task.id, { value: result.branch as LinkedBranch, expiresAt: Date.now() + GITHUB_CACHE_TTL_MS });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create branch."); }
    finally { setCreating(false); }
  };

  const deleteBranch = async () => {
    setRemovingBranch(true); setError(null);
    try {
      const response = await fetch(`/api/tasks/github/branch?taskId=${encodeURIComponent(task.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to delete the GitHub branch.");
      setBranch(null);
      taskBranchCache.set(task.id, { value: null, expiresAt: Date.now() + GITHUB_CACHE_TTL_MS });
      setConfirmingBranchRemoval(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete the GitHub branch."); }
    finally { setRemovingBranch(false); }
  };

  const heading = <div className="relative flex w-full items-center px-4"><p className="text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500">GitHub</p>{setupOpen && !branch && <button type="button" aria-label="Close GitHub branch setup" onClick={() => { setSetupOpen(false); setError(null); }} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"><X className="h-3.5 w-3.5" /></button>}</div>;
  if (loading) return <div className="w-full space-y-2">{heading}<div className="h-10 animate-pulse rounded-xl bg-neutral-50" /></div>;
  if (branch?.branch_deleted_at) return <div className="w-full space-y-2">{heading}<div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-500"><GitBranch className="h-4 w-4 shrink-0" /><span className="truncate">{branch.repository_full_name} · {branch.branch_name} (deleted after merge)</span></div></div>;
  if (branch) return <div className="w-full space-y-2">{heading}<div className="space-y-1 px-4"><a href={`https://github.com/${branch.repository_full_name}/tree/${encodeURIComponent(branch.branch_name)}`} target="_blank" rel="noreferrer" className="group block rounded-2xl bg-white px-3 py-2 text-xs text-neutral-700 shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-200 hover:bg-neutral-50 hover:shadow-[0_10px_32px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.95)]"><div className="flex items-center gap-2.5"><Github className="h-4 w-4 shrink-0 text-neutral-700" /><span className="min-w-0 flex-1 truncate font-medium text-neutral-800">{branch.repository_full_name}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-700" /></div><div className="mt-2 flex items-start gap-2 border-t border-neutral-100 pt-2"><GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" /><span className="min-w-0 break-all font-medium text-neutral-600">{branch.branch_name}</span></div></a><AnimatePresence initial={false} mode="wait"><motion.div key={confirmingBranchRemoval ? "confirm-delete" : "disconnect"} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.16 }} className="flex h-7 items-center gap-1"><span className="px-2 text-xs font-medium text-neutral-500">{confirmingBranchRemoval ? "Delete branch?" : null}</span>{confirmingBranchRemoval ? <><button type="button" disabled={disabled || removingBranch} onClick={deleteBranch} className="inline-flex h-7 items-center rounded-lg px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{removingBranch ? "Deleting…" : "Yes"}</button><button type="button" disabled={removingBranch} onClick={() => setConfirmingBranchRemoval(false)} className="inline-flex h-7 items-center rounded-lg px-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50">No</button></> : <button type="button" disabled={disabled} onClick={() => setConfirmingBranchRemoval(true)} className="inline-flex h-7 items-center rounded-lg px-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50">Disconnect</button>}</motion.div></AnimatePresence>{error && <p className="text-xs text-red-600">{error}</p>}</div></div>;
  if (!setupOpen) return <div className="w-full space-y-2">{heading}<div className="px-4"><motion.button layoutId="create-branch-button" type="button" disabled={disabled} onClick={() => { setError(null); setSetupOpen(true); }} transition={{ type: "spring", stiffness: 420, damping: 32 }} className="w-full rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"><Github className="mr-1.5 inline h-3.5 w-3.5" />Create branch</motion.button>{error && <p className="mt-2 text-xs text-red-600">{error}</p>}</div></div>;
  if (loadingRepositories) return <div className="w-full space-y-2">{heading}<div className="space-y-2 px-4"><div className="h-8 animate-pulse rounded-xl bg-neutral-100" /><div className="h-8 animate-pulse rounded-xl bg-neutral-100" /><motion.button layoutId="create-branch-button" type="button" disabled transition={{ type: "spring", stiffness: 420, damping: 32 }} className="w-full rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"><Github className="mr-1.5 inline h-3.5 w-3.5" />Create branch</motion.button></div></div>;
  if (!repositories.length) return <div className="w-full space-y-2">{heading}<p className="px-4 text-xs font-light text-neutral-400">{error || "No repositories are available to this GitHub installation."}</p></div>;
  const selected = repositories.find((item) => item.full_name === repository);
  return <div className="w-full space-y-2">{heading}<div className="space-y-2 px-4">
    <div className="grid grid-cols-1 gap-2"><div className="relative"><select value={repository} disabled={disabled || creating} onChange={(e) => { const selectedRepo = repositories.find((item) => item.full_name === e.target.value); setRepository(e.target.value); setBaseBranch(selectedRepo?.default_branch ?? ""); }} className="min-w-0 w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3 py-2 pr-10 text-xs">{repositories.map((item) => <option key={item.full_name} value={item.full_name}>{item.full_name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-700" /></div><div className="relative"><select value={baseBranch} disabled={disabled || creating} onChange={(e) => setBaseBranch(e.target.value)} className="min-w-0 w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3 py-2 pr-10 text-xs">{(branches.length ? branches : [baseBranch || selected?.default_branch || ""]).filter(Boolean).map((name) => <option key={name} value={name}>{name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-700" /></div></div>
    {error && <p className="text-xs text-red-600">{error}</p>}
    <motion.button layoutId="create-branch-button" type="button" disabled={disabled || creating} onClick={createBranch} transition={{ type: "spring", stiffness: 420, damping: 32 }} className="w-full rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"><Github className="mr-1.5 inline h-3.5 w-3.5" />{creating ? "Creating branch…" : "Create branch"}</motion.button>
  </div></div>;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export function CreateTasksPopup({
  open,
  onClose,
  onSaved,
  projects,
  defaultStatus = "todo",
  threadId,
  defaultProjectId,
  existing,
}: CreateTasksPopupProps) {
  const { user: authUser } = useAuth();
  const { activeAccountId, loading: accountLoading } = useActiveAccount();
  const [form, setForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigneeDisplayNames, setAssigneeDisplayNames] = useState<
    Record<string, string>
  >({});
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [blockersPopoverOpen, setBlockersPopoverOpen] = useState(false);
  const [blockerSearch, setBlockerSearch] = useState("");
  const [duePopoverOpen, setDuePopoverOpen] = useState(false);
  const [projectSelectOpen, setProjectSelectOpen] = useState(false);
  const [statusSelectOpen, setStatusSelectOpen] = useState(false);
  const [prioritySelectOpen, setPrioritySelectOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskPanelTab>("basics");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [checkingDeleteBranch, setCheckingDeleteBranch] = useState(false);
  const [linkedDeleteBranch, setLinkedDeleteBranch] = useState<LinkedBranch | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /** True while a nested dropdown is open, and briefly after — blocks dialog dismiss / overlay click-through. */
  const [blockDialogDismiss, setBlockDialogDismiss] = useState(false);
  const blockDialogDismissRef = useRef(false);
  const blockDialogDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const armDialogDismissBlock = useCallback(() => {
    if (blockDialogDismissTimerRef.current) {
      clearTimeout(blockDialogDismissTimerRef.current);
      blockDialogDismissTimerRef.current = null;
    }
    blockDialogDismissRef.current = true;
    setBlockDialogDismiss(true);
  }, []);

  const releaseDialogDismissBlock = useCallback(() => {
    if (blockDialogDismissTimerRef.current) {
      clearTimeout(blockDialogDismissTimerRef.current);
    }
    blockDialogDismissRef.current = true;
    setBlockDialogDismiss(true);
    blockDialogDismissTimerRef.current = setTimeout(() => {
      blockDialogDismissRef.current = false;
      setBlockDialogDismiss(false);
      blockDialogDismissTimerRef.current = null;
    }, 250);
  }, []);

  const clearDialogDismissBlock = useCallback(() => {
    if (blockDialogDismissTimerRef.current) {
      clearTimeout(blockDialogDismissTimerRef.current);
      blockDialogDismissTimerRef.current = null;
    }
    blockDialogDismissRef.current = false;
    setBlockDialogDismiss(false);
  }, []);

  const forceCloseDialog = useCallback(() => {
    clearDialogDismissBlock();
    setAssigneePopoverOpen(false);
    setBlockersPopoverOpen(false);
    setDuePopoverOpen(false);
    setProjectSelectOpen(false);
    setStatusSelectOpen(false);
    setPrioritySelectOpen(false);
    onClose();
  }, [clearDialogDismissBlock, onClose]);

  const setNestedDropdownOpen = useCallback(
    (setter: React.Dispatch<React.SetStateAction<boolean>>) => (next: boolean) => {
      if (next) {
        armDialogDismissBlock();
        setter(true);
        return;
      }
      setter(false);
      releaseDialogDismissBlock();
    },
    [armDialogDismissBlock, releaseDialogDismissBlock]
  );

  const handleAssigneePopoverOpenChange = useCallback(
    (next: boolean) => {
      if (next && !form.project_id) return;
      setNestedDropdownOpen(setAssigneePopoverOpen)(next);
    },
    [form.project_id, setNestedDropdownOpen]
  );
  const handleBlockersPopoverOpenChange = useCallback(
    (next: boolean) => {
      if (next && !form.project_id) return;
      if (!next) setBlockerSearch("");
      setNestedDropdownOpen(setBlockersPopoverOpen)(next);
    },
    [form.project_id, setNestedDropdownOpen]
  );
  const projectNameRef = useRef<HTMLSpanElement | null>(null);
  const [isProjectNameTruncated, setIsProjectNameTruncated] = useState(false);
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);
  const [loadingProjectMembers, setLoadingProjectMembers] = useState(false);
  const [accessibleProjects, setAccessibleProjects] = useState<Project[]>([]);
  const [loadingAccessibleProjects, setLoadingAccessibleProjects] = useState(false);
  const [projectTasks, setProjectTasks] = useState<TaskBlockerOption[]>([]);
  const [loadingProjectTasks, setLoadingProjectTasks] = useState(false);

  useEffect(() => {
    return () => {
      if (blockDialogDismissTimerRef.current) {
        clearTimeout(blockDialogDismissTimerRef.current);
      }
    };
  }, []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    if (!authUser?.id || !open) return;
    const resolve = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("id", authUser.id)
        .maybeSingle();
      setCurrentUserId(data?.id ?? null);
    };
    resolve();
  }, [authUser?.id, open]);

  const userId = currentUserId ?? authUser?.id ?? null;

  /* Projects the current user owns or is a member of (source of truth for the dropdown). */
  useEffect(() => {
    if (!open) {
      setAccessibleProjects([]);
      setLoadingAccessibleProjects(false);
      return;
    }
    if (!userId || !activeAccountId || accountLoading) return;

    let cancelled = false;
    setLoadingAccessibleProjects(true);
    const run = async () => {
      try {
        const data = await fetchAccessibleProjects(userId, {
          accountId: activeAccountId,
        });
        if (!cancelled) setAccessibleProjects(data);
      } catch {
        if (!cancelled) setAccessibleProjects([]);
      } finally {
        if (!cancelled) setLoadingAccessibleProjects(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, userId, activeAccountId, accountLoading]);

  const projectsForSelect = useMemo(() => {
    if (accessibleProjects.length > 0 || !loadingAccessibleProjects) {
      return accessibleProjects;
    }
    return projects;
  }, [accessibleProjects, loadingAccessibleProjects, projects]);

  const projectOptions = useMemo(() => {
    const filtered = projectsForSelect.filter((p) =>
      TASK_BOARD_PROJECT_STATUSES.includes(p.status)
    );
    if (!existing?.project_id) return filtered;

    const existingProject = projectsForSelect.find(
      (p) => p.id === existing.project_id
    );
    if (
      existingProject &&
      !filtered.some((p) => p.id === existingProject.id)
    ) {
      return [existingProject, ...filtered];
    }
    return filtered;
  }, [projectsForSelect, existing?.project_id]);

  const prevOpenRef = useRef(false);
  const existingIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_TASK_FORM);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const existingChanged = existing?.id !== existingIdRef.current;

    prevOpenRef.current = open;
    existingIdRef.current = existing?.id;

    if (!open) return;
    if (!justOpened && !existingChanged) return;

    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description ?? "",
        status: existing.status,
        due_date: existing.due_date ?? "",
        priority: existing.priority?.toString() ?? "3",
        project_id: existing.project_id,
        assignee_ids: getTaskAssigneeIds(existing),
        blocker_task_ids: [],
        is_public: existing.is_private === false,
      });
    } else {
      const firstSelectable =
        projectsForSelect.find((p) =>
          TASK_BOARD_PROJECT_STATUSES.includes(p.status)
        )?.id ?? "";
      const initialProjectId =
        defaultProjectId &&
        projectsForSelect.some(
          (p) =>
            p.id === defaultProjectId &&
            TASK_BOARD_PROJECT_STATUSES.includes(p.status)
        )
          ? defaultProjectId
          : firstSelectable;
      setForm({
        ...EMPTY_TASK_FORM,
        status: defaultStatus,
        project_id: initialProjectId,
        assignee_ids: currentUserId ? [currentUserId] : [],
      });
    }
    setError(null);
  }, [
    existing,
    defaultStatus,
    defaultProjectId,
    open,
    projectsForSelect,
    currentUserId,
    userId,
    loadingAccessibleProjects,
    accessibleProjects.length,
  ]);

  // Default project once accessible options are ready (new task only)
  useEffect(() => {
    if (!open || existing) return;
    if (loadingAccessibleProjects && projectOptions.length === 0) return;

    const validIds = new Set(projectOptions.map((p) => p.id));
    const preferred =
      defaultProjectId && validIds.has(defaultProjectId)
        ? defaultProjectId
        : projectOptions[0]?.id ?? "";

    if (!preferred) return;

    setForm((f) => {
      if (f.project_id && validIds.has(f.project_id)) return f;
      return { ...f, project_id: preferred };
    });
  }, [
    open,
    existing,
    loadingAccessibleProjects,
    projectOptions,
    defaultProjectId,
  ]);

  // When currentUserId resolves after dialog open, set assignee only if not already chosen
  useEffect(() => {
    if (!open || existing || !currentUserId) return;
    setForm((f) =>
      f.assignee_ids.length > 0 ? f : { ...f, assignee_ids: [currentUserId] }
    );
  }, [open, existing, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    const loadProjectTasks = async () => {
      // The accessible-projects query is scoped to the active account and to
      // projects the current user owns or belongs to. Wait for it before
      // loading blocker tasks so this list cannot fall back to the current
      // project while the broader access list is still resolving.
      if (
        !open ||
        !form.project_id ||
        !userId ||
        !activeAccountId ||
        accountLoading ||
        loadingAccessibleProjects
      ) {
        setProjectTasks([]);
        setLoadingProjectTasks(false);
        return;
      }

      const accessibleProjectIds = accessibleProjects.map((project) => project.id);
      if (accessibleProjectIds.length === 0) {
        setProjectTasks([]);
        setLoadingProjectTasks(false);
        return;
      }

      setLoadingProjectTasks(true);
      const supabase = getSupabaseClient();
      const { data, error: loadError } = await supabase
        .from("project_tasks")
        .select("id, title, status, project_id")
        .in("project_id", accessibleProjectIds)
        .neq("id", existing?.id ?? "00000000-0000-0000-0000-000000000000")
        .order("title");

      if (cancelled) return;
      setProjectTasks(loadError ? [] : (data ?? []) as TaskBlockerOption[]);
      setLoadingProjectTasks(false);
    };

    void loadProjectTasks();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    form.project_id,
    existing?.id,
    userId,
    activeAccountId,
    accountLoading,
    loadingAccessibleProjects,
    accessibleProjects,
  ]);

  useEffect(() => {
    if (!open || !existing?.id) return;

    let cancelled = false;
    const loadBlockers = async () => {
      const supabase = getSupabaseClient();
      const { data, error: loadError } = await supabase
        .from("project_task_dependencies")
        .select("blocker_task_id")
        .eq("blocking_task_id", existing.id);

      if (cancelled || loadError) return;
      setForm((current) => ({
        ...current,
        blocker_task_ids: (data ?? []).map(
          (dependency: { blocker_task_id: string }) => dependency.blocker_task_id
        ),
      }));
    };

    void loadBlockers();
    return () => {
      cancelled = true;
    };
  }, [open, existing?.id]);

  useEffect(() => {
    if (!open || !form.project_id) {
      setProjectMemberIds([]);
      setLoadingProjectMembers(false);
      return;
    }

    const project = projectsForSelect.find((p) => p.id === form.project_id);
    if (!project) {
      setProjectMemberIds([]);
      return;
    }

    let cancelled = false;
    setProjectMemberIds([]);
    const loadMembers = async () => {
      setLoadingProjectMembers(true);
      try {
        const supabase = getSupabaseClient();

        let ownerId = project.owner_id ?? null;
        if (!ownerId) {
          const { data: projectRow } = await supabase
            .from("projects")
            .select("owner_id")
            .eq("id", form.project_id)
            .maybeSingle();
          ownerId = projectRow?.owner_id ?? null;
        }

        const { data: membersData, error } = await supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", form.project_id);

        if (error) throw error;

        const ids = withOwnerAsMember(
          (membersData ?? []).map((m: { user_id: string }) => m.user_id),
          ownerId
        );
        if (!cancelled) setProjectMemberIds(ids);
      } catch (err) {
        console.error("Error loading project members:", err);
        if (!cancelled) {
          const ownerId =
            project.owner_id ??
            (
              await getSupabaseClient()
                .from("projects")
                .select("owner_id")
                .eq("id", form.project_id)
                .maybeSingle()
            ).data?.owner_id ??
            null;
          setProjectMemberIds(withOwnerAsMember([], ownerId));
        }
      } finally {
        if (!cancelled) setLoadingProjectMembers(false);
      }
    };

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [open, form.project_id, projectsForSelect]);

  useEffect(() => {
    if (loadingProjectMembers) return;

    if (!form.project_id) {
      setForm((f) => (f.assignee_ids.length ? { ...f, assignee_ids: [] } : f));
      return;
    }

    if (projectMemberIds.length === 0) return;

    setForm((f) => {
      const kept = f.assignee_ids.filter((id) => projectMemberIds.includes(id));
      if (kept.length > 0) {
        if (kept.length === f.assignee_ids.length) return f;
        return { ...f, assignee_ids: kept };
      }
      const nextAssignee =
        currentUserId && projectMemberIds.includes(currentUserId)
          ? [currentUserId]
          : [];
      if (
        nextAssignee.length === f.assignee_ids.length &&
        nextAssignee.every((id, i) => id === f.assignee_ids[i])
      ) {
        return f;
      }
      return { ...f, assignee_ids: nextAssignee };
    });
  }, [loadingProjectMembers, projectMemberIds, form.project_id, currentUserId]);

  useEffect(() => {
    if (form.assignee_ids.length === 0) {
      setAssigneeDisplayNames({});
      return;
    }
    const fetchNames = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", form.assignee_ids);
      const next: Record<string, string> = {};
      for (const row of data ?? []) {
        const name =
          `${(row.first_name ?? "").trim()} ${(row.last_name ?? "").trim()}`.trim();
        next[row.id] = name || row.email || "Assigned";
      }
      setAssigneeDisplayNames(next);
    };
    void fetchNames();
  }, [form.assignee_ids.join(",")]);

  const selectedProject = projectsForSelect.find(
    (project) => project.id === form.project_id
  );
  const selectedProjectName = selectedProject?.name ?? "No project";
  const projectNameById = useMemo(
    () => new Map(projectsForSelect.map((project) => [project.id, project.name])),
    [projectsForSelect]
  );
  const projectById = useMemo(
    () => new Map(projectsForSelect.map((project) => [project.id, project])),
    [projectsForSelect]
  );
  const selectedBlockerTitles = projectTasks
    .filter((task) => form.blocker_task_ids.includes(task.id))
    .map((task) => {
      const projectName = projectNameById.get(task.project_id);
      return projectName && task.project_id !== form.project_id
        ? `${task.title} (${projectName})`
        : task.title;
    })
    .join(", ");
  const filteredProjectTasks = useMemo(() => {
    const query = blockerSearch.trim().toLocaleLowerCase();
    return projectTasks.filter((task) => {
      // A task cannot block itself. Keep this guard in the rendered options as
      // well as the query-level exclusion so stale task data cannot surface it.
      if (task.id === existing?.id) return false;
      const isExistingBlocker = form.blocker_task_ids.includes(task.id);
      if (task.status === "completed" && !isExistingBlocker) return false;
      return !query || task.title.toLocaleLowerCase().includes(query);
    });
  }, [blockerSearch, existing?.id, form.blocker_task_ids, projectTasks]);

  useEffect(() => {
    const textElement = projectNameRef.current;
    if (!textElement) {
      setIsProjectNameTruncated(false);
      return;
    }

    const updateTruncationState = () => {
      setIsProjectNameTruncated(textElement.scrollWidth > textElement.clientWidth + 1);
    };

    updateTruncationState();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateTruncationState);
    observer.observe(textElement);

    return () => observer.disconnect();
  }, [selectedProjectName, open]);

  const requestDelete = async () => {
    if (!existing) return;
    setDeleteConfirmOpen(true);
    setCheckingDeleteBranch(true);
    setLinkedDeleteBranch(null);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/tasks/github/branch?taskId=${encodeURIComponent(existing.id)}`);
      const result = await response.json();
      if (response.ok && result.branch) setLinkedDeleteBranch(result.branch);
    } finally {
      setCheckingDeleteBranch(false);
    }
  };

  const handleDelete = async (deleteBranch = false) => {
    if (!existing) return;
    setSaving(true);
    setDeleteError(null);
    try {
      if (deleteBranch) {
        const response = await fetch(`/api/tasks/github/branch?taskId=${encodeURIComponent(existing.id)}`, { method: "DELETE" });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || "Unable to delete the linked GitHub branch.");
        }
      }
      const supabase = getSupabaseClient();
      const { error: err } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", existing.id);
      if (err) throw err;
      setDeleteConfirmOpen(false);
      onSaved();
      onClose();
    } catch (e: unknown) {
      setDeleteError((e as { message?: string })?.message ?? "Failed to delete task.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!form.project_id) {
      setError("Please select a project.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const actorUserId = currentUserId ?? authUser?.id ?? null;
      const actorName = await resolveActorDisplayName(supabase, actorUserId);
      const taskTitle = form.title.trim();
      const previousAssigneeIds = existing ? getTaskAssigneeIds(existing) : [];
      const assigneeIds = [...new Set(form.assignee_ids.filter(Boolean))];
      const assignedBy = resolveAssignedBy(assigneeIds, actorUserId);
      const newlyAdded = assigneeIds.filter(
        (id) => !previousAssigneeIds.includes(id) && id !== actorUserId
      );
      const assigneesChanged =
        assigneeIds.length !== previousAssigneeIds.length ||
        assigneeIds.some((id) => !previousAssigneeIds.includes(id));
      const blockerTaskIds = form.status === "blocked"
        ? [...new Set(
            form.blocker_task_ids.filter(
              (id) => Boolean(id) && id !== existing?.id
            )
          )]
        : [];

      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        due_date: form.due_date || null,
        priority: form.priority ? parseInt(form.priority, 10) : null,
        project_id: form.project_id,
        is_private: !form.is_public,
      };
      if (form.status === "completed") {
        // Keep the original completion time while editing a completed task,
        // otherwise record the status transition for completion automations.
        payload.completed_at = existing?.status === "completed"
          ? existing.completed_at ?? new Date().toISOString()
          : new Date().toISOString();
      } else if (existing?.status === "completed") {
        payload.completed_at = null;
      }
      if (threadId) payload.thread_id = threadId;

      if (assigneesChanged) {
        payload.assigned_by = assignedBy;
      }

      let taskId = existing?.id ?? null;

      if (existing) {
        const { error: err } = await supabase
          .from("project_tasks")
          .update(payload)
          .eq("id", existing.id);
        if (err) throw err;
        taskId = existing.id;
      } else {
        payload.assigned_by = assignedBy;
        const { data: newTask, error: err } = await supabase
          .from("project_tasks")
          .insert(payload)
          .select("id")
          .single();
        if (err) throw err;
        taskId = newTask?.id ?? null;
      }

      if (!taskId) throw new Error("Failed to save task.");

      const { data: currentDependencies, error: dependenciesError } = await supabase
        .from("project_task_dependencies")
        .select("blocker_task_id")
        .eq("blocking_task_id", taskId);
      if (dependenciesError) throw dependenciesError;

      const currentBlockerIds = (currentDependencies ?? []).map(
        (dependency: { blocker_task_id: string }) => dependency.blocker_task_id
      );
      const blockerIdsToAdd = blockerTaskIds.filter(
        (id) => !currentBlockerIds.includes(id)
      );
      const blockerIdsToRemove = currentBlockerIds.filter(
        (id) => !blockerTaskIds.includes(id)
      );

      if (blockerIdsToAdd.length > 0) {
        const { error: insertBlockersError } = await supabase
          .from("project_task_dependencies")
          .insert(
            blockerIdsToAdd.map((blockerTaskId) => ({
              blocking_task_id: taskId,
              blocker_task_id: blockerTaskId,
              created_by: actorUserId,
            }))
          );
        if (insertBlockersError) throw insertBlockersError;
      }

      if (blockerIdsToRemove.length > 0) {
        const { error: removeBlockersError } = await supabase
          .from("project_task_dependencies")
          .delete()
          .eq("blocking_task_id", taskId)
          .in("blocker_task_id", blockerIdsToRemove);
        if (removeBlockersError) throw removeBlockersError;
      }

      await syncProjectTaskAssignees(
        supabase,
        taskId,
        assigneeIds,
        assignedBy
      );

      if (existing && existing.status !== "completed" && form.status === "completed") {
        // Await the request before the popup unmounts; this helper absorbs
        // delivery errors, so it never prevents the task from being saved.
        await sendTaskBlockerCompletedEmail({ taskId });
      }

      await Promise.all(
        newlyAdded.map((assigneeId) =>
          Promise.all([
            notifyTaskAssignee(supabase, {
              assigneeId,
              taskId: taskId!,
              taskTitle,
              projectId: form.project_id,
              projectName: selectedProject?.name,
              actorUserId,
              actorName,
            }),
            sendTaskAssignmentEmail({ taskId: taskId!, assigneeId }),
          ])
        )
      );

      onSaved();
      onClose();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  const parsedDueDate = form.due_date ? parseISO(form.due_date) : null;
  const dueDate = parsedDueDate && isValid(parsedDueDate) ? parsedDueDate : null;
  const canSchedule = dueDate !== null;

  return (
    <>
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(next) => {
        if (!next && blockDialogDismissRef.current) return;
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[900px] [&>button]:focus:outline-none [&>button]:focus:ring-0 [&>button]:focus-visible:ring-0 [&>button]:ring-0"
        overlayClassName={blockDialogDismiss ? "pointer-events-none" : undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (blockDialogDismissRef.current) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (blockDialogDismissRef.current) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Always allow Escape to close the task popup.
          e.preventDefault();
          forceCloseDialog();
        }}
      >
        <button
          type="button"
          onClick={forceCloseDialog}
          className="absolute right-6 top-4 z-20 cursor-pointer rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 focus-visible:ring-0"
          aria-label="Close"
        >
          <X className="h-6 w-6 text-foreground" strokeWidth={1.5} />
        </button>
        <DialogHeader />

        <div className="grid grid-cols-[2fr_1fr] divide-x divide-gray-200 gap-6 py-4">
          {/* Left Column */}
          <div className="min-w-0 space-y-4 pr-6">
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Add title"
              disabled={saving}
              className="border-0 border-b-2 rounded-none bg-transparent shadow-none focus:ring-0 focus-visible:ring-0 px-0 border-b-[var(--kenoo-sky)] focus:border-b-[var(--kenoo-sky)] placeholder:text-neutral-300"
            />

            <SimpleMarkdownEditor
              value={form.description}
              onChange={(text) => setForm((f) => ({ ...f, description: text }))}
              placeholder="Description"
              disabled={saving}
              aiConfig={{
                name: form.title,
                type: "task",
                projectName: selectedProject?.name,
                projectDescription: selectedProject?.description ?? undefined,
              }}
              onAIGenerate={(text) => setForm((f) => ({ ...f, description: text }))}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-2 pl-6 min-w-0">
            <div role="tablist" aria-label="Task details" className="mb-4 flex items-center gap-1 rounded-full bg-neutral-100/80 p-1">
              {(["basics", "schedule", "settings"] as const).map((tab) => {
                const disabled = saving || (tab === "schedule" && !canSchedule);
                return <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} disabled={disabled} title={tab === "schedule" && !canSchedule ? "Set a due date to enable scheduling" : undefined} onClick={() => setActiveTab(tab)} className={cn("flex-1 rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition-colors", activeTab === tab ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:bg-white/60 hover:text-neutral-800", disabled && "cursor-not-allowed opacity-40")}>{tab}</button>;
              })}
            </div>

            {activeTab === "basics" && <>
            {/* Project */}
            <Select
              value={form.project_id}
              onValueChange={(v) => setForm((f) => ({
                ...f,
                project_id: v,
                blocker_task_ids: f.project_id === v ? f.blocker_task_ids : [],
              }))}
              open={projectSelectOpen}
              onOpenChange={setNestedDropdownOpen(setProjectSelectOpen)}
              disabled={saving || (loadingAccessibleProjects && projectOptions.length === 0)}
            >
              <TooltipProvider delayDuration={180}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className="inline-flex max-w-full cursor-pointer overflow-hidden"
                    >
                      <SelectTrigger className="w-auto max-w-full border-0 rounded-full bg-transparent hover:bg-gray-100 focus:ring-0 focus-visible:ring-0 px-4 [&>svg]:hidden">
                        <div className="inline-flex items-center gap-2 min-w-0">
                          <span className={cn("shrink-0", fieldLabelClass)}>Project:</span>
                          <motion.div
                            key={form.project_id || "no-project"}
                            initial={{ opacity: 0.6 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="max-w-[260px] min-w-0"
                          >
                            <span
                              ref={projectNameRef}
                              className={cn(
                                fieldValueClass,
                                "[&_[data-placeholder]]:text-neutral-300"
                              )}
                            >
                              {loadingAccessibleProjects &&
                              !form.project_id &&
                              projectOptions.length === 0 ? (
                                <span className={fieldPlaceholderClass}>
                                  Loading…
                                </span>
                              ) : (
                                <SelectValue placeholder="No project" />
                              )}
                            </span>
                          </motion.div>
                        </div>
                      </SelectTrigger>
                    </motion.div>
                  </TooltipTrigger>
                  {isProjectNameTruncated ? (
                    <TooltipContent side="top" align="start">
                      {selectedProjectName}
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
              <SelectContent>
                {loadingAccessibleProjects && projectOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs font-light text-neutral-400">
                    Loading projects…
                  </div>
                ) : projectOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs font-light text-neutral-400">
                    No accessible projects
                  </div>
                ) : (
                  projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: projectSwatchColor(p) }}
                          aria-hidden
                        />
                        <span className="truncate">{p.name}</span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Assignees */}
            <Popover
              modal={false}
              open={assigneePopoverOpen}
              onOpenChange={handleAssigneePopoverOpenChange}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={saving || !form.project_id}
                  className="w-full flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 hover:bg-gray-100 focus:outline-none text-left disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={cn("shrink-0", fieldLabelClass)}>Assignees:</span>
                  <span
                    className={cn(
                      "flex-1 truncate",
                      fieldValueClass,
                      form.assignee_ids.length === 0 && fieldPlaceholderClass
                    )}
                  >
                    {!form.project_id
                      ? "Select a project"
                      : form.assignee_ids.length === 0
                        ? "No assignees"
                        : form.assignee_ids
                            .map((id) =>
                              id === currentUserId
                                ? "You"
                                : assigneeDisplayNames[id] ?? "Assigned"
                            )
                            .join(", ")}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[320px] p-0 overflow-hidden rounded-2xl border border-neutral-200/60 shadow-xl bg-white/80 backdrop-blur-xl"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                {loadingProjectMembers ? (
                  <p className="px-4 py-3 text-sm font-light text-neutral-500">
                    Loading project members…
                  </p>
                ) : (
                  <AgentSearch
                    key={form.project_id}
                    multiple
                    values={form.assignee_ids}
                    allowedUserIds={projectMemberIds}
                    emptyMessage="No project members found"
                    onSelect={(agentId) => {
                      setForm((f) => ({
                        ...f,
                        assignee_ids: toggleAssigneeId(f.assignee_ids, agentId),
                      }));
                    }}
                  />
                )}
              </PopoverContent>
            </Popover>

            {/* Status */}
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}
              open={statusSelectOpen}
              onOpenChange={setNestedDropdownOpen(setStatusSelectOpen)}
              disabled={saving}
            >
              <SelectTrigger className="border-0 rounded-full bg-transparent hover:bg-gray-100 focus:ring-0 focus-visible:ring-0 px-4 [&>svg]:hidden">
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Status:</span>
                  <span className={cn(fieldValueClass, "[&_[data-placeholder]]:text-neutral-300")}>
                    <SelectValue />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {KANBAN_COLUMNS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {form.status === "blocked" && (
              <Popover
                modal={false}
                open={blockersPopoverOpen}
                onOpenChange={handleBlockersPopoverOpenChange}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={saving || !form.project_id}
                    className="w-full flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 hover:bg-gray-100 focus:outline-none text-left disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={cn("shrink-0", fieldLabelClass)}>Blockers:</span>
                    <span
                      className={cn(
                        "flex-1 truncate",
                        fieldValueClass,
                        form.blocker_task_ids.length === 0 && fieldPlaceholderClass
                      )}
                    >
                      {!form.project_id
                        ? "Select a project"
                        : form.blocker_task_ids.length === 0
                          ? "Select tasks"
                          : selectedBlockerTitles || "Select tasks"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[360px] p-1 overflow-hidden rounded-2xl border border-neutral-200/60 shadow-xl bg-white/80 backdrop-blur-xl"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onWheelCapture={(e) => e.stopPropagation()}
                  onTouchMoveCapture={(e) => e.stopPropagation()}
                >
                  <p className="px-3 py-2 text-xs font-light text-neutral-500">
                    Select the tasks that must be resolved first.
                  </p>
                  <div className="px-2 pb-2">
                    <Input
                      value={blockerSearch}
                      onChange={(event) => setBlockerSearch(event.target.value)}
                      placeholder="Search tasks"
                      className="h-9 rounded-xl border-neutral-200 bg-white text-sm shadow-none focus-visible:ring-0"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {loadingProjectTasks ? (
                      <p className="px-3 py-3 text-sm font-light text-neutral-500">
                        Loading project tasks…
                      </p>
                    ) : filteredProjectTasks.length === 0 ? (
                      <p className="px-3 py-3 text-sm font-light text-neutral-500">
                        {blockerSearch.trim()
                          ? "No matching tasks"
                          : "No other accessible tasks"}
                      </p>
                    ) : (
                      filteredProjectTasks.map((task) => {
                        const selected = form.blocker_task_ids.includes(task.id);
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => setForm((current) => ({
                              ...current,
                              blocker_task_ids: selected
                                ? current.blocker_task_ids.filter((id) => id !== task.id)
                                : [...current.blocker_task_ids, task.id],
                            }))}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-neutral-100"
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                selected
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-300 bg-white"
                              )}
                              aria-hidden
                            >
                              {selected ? <Check className="h-3 w-3" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-light text-neutral-900">
                                {task.title}
                              </span>
                              <span className="flex min-w-0 items-center gap-1 text-[11px] text-neutral-400">
                                {projectNameById.get(task.project_id) ? (
                                  <>
                                    <span
                                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                                      style={{
                                        backgroundColor: projectById.get(task.project_id)
                                          ? projectSwatchColor(projectById.get(task.project_id)!)
                                          : "rgb(163 163 163)",
                                      }}
                                      aria-hidden
                                    />
                                    <span className="min-w-0 truncate">
                                      {projectNameById.get(task.project_id)}
                                    </span>
                                    <span aria-hidden>·</span>
                                  </>
                                ) : null}
                                <span className="shrink-0">{TASK_STATUS_CONFIG[task.status].label}</span>
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Priority */}
            <Select
              value={form.priority}
              onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              open={prioritySelectOpen}
              onOpenChange={setNestedDropdownOpen(setPrioritySelectOpen)}
              disabled={saving}
            >
              <SelectTrigger className="border-0 rounded-full bg-transparent hover:bg-gray-100 focus:ring-0 focus-visible:ring-0 px-4 [&>svg]:hidden">
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Priority:</span>
                  <span className={cn(fieldValueClass, "[&_[data-placeholder]]:text-neutral-300")}>
                    <SelectValue />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Due date */}
            <MiniDatePicker
              label="Due:"
              value={dueDate}
              onChange={(date) => {
                setForm((f) => ({
                  ...f,
                  due_date: date ? format(date, "yyyy-MM-dd") : "",
                }));
              }}
              showClearButton
              disabled={saving}
              open={duePopoverOpen}
              onOpenChange={setNestedDropdownOpen(setDuePopoverOpen)}
              labelClassName={fieldLabelClass}
              valueClassName={fieldValueClass}
              placeholderClassName={fieldPlaceholderClass}
            />

            </>}

            {activeTab === "settings" && <div className="space-y-3">
            <div className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={fieldValueClass}>Visibility</p>
                  <p className="mt-0.5 text-[11px] font-light text-neutral-500">
                    Choose who can see this task.
                  </p>
                </div>
                <Switch
                  checked={form.is_public}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, is_public: checked }))
                  }
                  disabled={saving}
                  aria-label="Make task public"
                />
              </div>
              <p className="mt-3 text-[12px] font-light text-neutral-600">
                {form.is_public ? "Public task" : "Private task"}
              </p>
            </div>

            {!existing && (
              <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-3 text-xs font-light leading-5 text-neutral-500">
                Save this task first, then return to Settings to connect or create a GitHub branch.
              </div>
            )}
            </div>}

            {existing && <div className={cn("border-t border-neutral-100 pt-4 mt-3 space-y-2", activeTab !== "settings" && "hidden")}><TaskBranchField task={existing} disabled={saving} open={open} /></div>}

            {activeTab === "schedule" && <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/60 px-4 py-4">
              <p className="text-sm font-medium text-neutral-900">Schedule this task</p>
              <p className="mt-1 text-xs font-light leading-5 text-neutral-500">This task is due {format(dueDate!, "MMMM d, yyyy")}. Open it in Calendar to add or adjust time blocks.</p>
              <a href="https://calendar.kenoo.io" className="mt-3 inline-flex rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-700">Open Calendar</a>
            </div>}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 -mt-2">{error}</p>}

        <DialogFooter>
          <div className="flex items-center justify-end gap-2 w-full">
            {existing && (
              <button
                type="button"
                onClick={() => void requestDelete()}
                disabled={saving}
                className={popupButtonOuterClass}
              >
                <div className={popupButtonInnerClass}>
                  <Trash2 className="h-[18px] w-[18px] stroke-[1.5] text-neutral-500" />
                </div>
              </button>
            )}
            <button
              type="button"
              onClick={forceCloseDialog}
              disabled={saving}
              className={modalSecondaryButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.project_id}
              className={modalPrimaryButtonClass}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={deleteConfirmOpen} onOpenChange={(next) => !saving && setDeleteConfirmOpen(next)}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[620px] gap-0 rounded-[28px] p-6">
        <DialogHeader className="p-0"><DialogTitle className="text-lg font-semibold tracking-tight text-neutral-950">Delete task?</DialogTitle></DialogHeader>
        <div className="mt-2 flex flex-col gap-4">
          <p className="text-sm leading-6 text-neutral-500">&ldquo;{existing?.title}&rdquo; will be permanently deleted.</p>
          {checkingDeleteBranch ? <div className="h-14 animate-pulse rounded-2xl bg-neutral-50" /> : linkedDeleteBranch && !linkedDeleteBranch.branch_deleted_at ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">This task is linked to <span className="font-medium">{linkedDeleteBranch.repository_full_name} · {linkedDeleteBranch.branch_name}</span>.<p className="mt-1 text-xs leading-5 text-amber-800">Would you also like to delete that GitHub branch?</p></div> : null}
          {deleteError ? <p className="text-xs text-red-600">{deleteError}</p> : null}
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => setDeleteConfirmOpen(false)} disabled={saving} className={cn(modalSecondaryButtonClass, "whitespace-nowrap")}>Cancel</button>{linkedDeleteBranch && !linkedDeleteBranch.branch_deleted_at && !checkingDeleteBranch ? <button type="button" onClick={() => void handleDelete(false)} disabled={saving} className={cn(modalSecondaryButtonClass, "whitespace-nowrap")}>Delete task only</button> : null}<button type="button" onClick={() => void handleDelete(Boolean(linkedDeleteBranch && !linkedDeleteBranch.branch_deleted_at))} disabled={saving || checkingDeleteBranch} className="inline-flex h-10 whitespace-nowrap items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Deleting…" : linkedDeleteBranch && !linkedDeleteBranch.branch_deleted_at ? "Delete task & branch" : "Delete"}</button></div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
