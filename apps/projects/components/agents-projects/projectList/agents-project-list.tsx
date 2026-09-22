"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@walls/auth";
import { getSupabaseClient } from "@walls/auth";
import { motion } from "framer-motion";
import {
  FolderOpen,
  Plus,
  X,
  Calendar,
  ChevronRight,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveAccount } from "@/components/active-account-context";
import { ProjectsHeader } from "../projects-header";
import {
  Project,
  ProjectWithStats,
  ProjectStatus,
  PROJECT_STATUS_CONFIG,
} from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateProjectsPopup } from "../create-projects-popup";
import { isTaskVisibleToUser } from "../task-visibility";
import { CreateTasksPopup } from "../create-tasks-popup";

/* ─── Markdown helpers ───────────────────────────────────────────────────── */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) return <strong key={i}>{boldMatch[1]}</strong>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function renderMarkdownPreview(
  text: string,
  options?: { maxLines?: number; textClassName?: string }
): React.ReactNode {
  if (!text.trim()) return null;
  const lines = text.split("\n");
  const limitedLines =
    options?.maxLines && options.maxLines > 0 ? lines.slice(0, options.maxLines) : lines;
  const textClassName = options?.textClassName ?? "";

  return (
    <>
      {limitedLines.map((line, i) => {
        const h3 = line.match(/^###\s+(.*)/);
        const h2 = !h3 ? line.match(/^##\s+(.*)/) : null;
        const h1 = !h3 && !h2 ? line.match(/^#\s+(.*)/) : null;
        const bullet = line.match(/^-\s+(.*)/);
        const numbered = line.match(/^(\d+)\.\s+(.*)/);

        if (h3) {
          return (
            <div key={i} className="font-semibold text-sm mt-1">
              {renderInlineMarkdown(h3[1])}
            </div>
          );
        }

        if (h2) {
          return (
            <div key={i} className="font-semibold text-base mt-1.5">
              {renderInlineMarkdown(h2[1])}
            </div>
          );
        }

        if (h1) {
          return (
            <div key={i} className="font-bold text-lg mt-2">
              {renderInlineMarkdown(h1[1])}
            </div>
          );
        }

        if (bullet) {
          return (
            <div key={i} className="flex items-start gap-1.5">
              <span className="mt-[-0.5px] text-current shrink-0">•</span>
              <span className={textClassName}>{renderInlineMarkdown(bullet[1])}</span>
            </div>
          );
        }

        if (numbered) {
          return (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-neutral-500 shrink-0">{numbered[1]}.</span>
              <span className={textClassName}>{renderInlineMarkdown(numbered[2])}</span>
            </div>
          );
        }

        if (line.trim() === "") {
          return <div key={i} className="h-1.5" />;
        }

        return (
          <div key={i} className={textClassName}>
            {renderInlineMarkdown(line)}
          </div>
        );
      })}
    </>
  );
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
type SortKey = "name" | "priority" | "due_date" | "progress";

type ProjectListColumn = "name" | "status" | "progress" | "tasks" | "due_date" | "actions";

const PROJECT_LIST_COLUMN_WIDTHS: Record<ProjectListColumn, number> = {
  name: 320,
  status: 150,
  progress: 180,
  tasks: 110,
  due_date: 145,
  actions: 130,
};

const PROJECT_LIST_MIN_COLUMN_WIDTHS: Record<ProjectListColumn, number> = {
  name: 260,
  status: 125,
  progress: 150,
  tasks: 100,
  due_date: 110,
  actions: 120,
};

const projectsListCache = new Map<string, ProjectWithStats[]>();

function getProjectsListCacheKey({
  userId,
  accountId,
  search,
  status,
}: {
  userId: string;
  accountId: string;
  search: string;
  status: string;
}) {
  return `${userId}:${accountId}:${search}:${status}`;
}

/* ─── Column headers ────────────────────────────────────────────────────── */
function ColumnHeaders({
  sortBy,
  sortDir,
  onSort,
  columnWidths,
  resizingColumn,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: {
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  columnWidths: Record<ProjectListColumn, number>;
  resizingColumn: ProjectListColumn | null;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>, key: ProjectListColumn) => void;
  onResizeMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeEnd: () => void;
}) {
  const headerBtn = (key: SortKey, column: ProjectListColumn, label: string) => {
    const active = sortBy === key;
    const SortIcon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
    <button
      type="button"
      onClick={() => onSort(key)}
      className={cn(
        "relative flex shrink-0 items-center gap-1.5 px-4 text-[11px] font-normal uppercase tracking-[0.16em] transition-colors",
        active ? "text-neutral-800" : "text-neutral-500 hover:text-neutral-800"
      )}
      style={{ width: columnWidths[column] }}
    >
      {label}
      <SortIcon className={cn("h-3 w-3", !active && "text-neutral-300")} strokeWidth={1.7} />
      <ColumnResizeHandle
        column={column}
        resizingColumn={resizingColumn}
        onResizeStart={onResizeStart}
        onResizeMove={onResizeMove}
        onResizeEnd={onResizeEnd}
      />
    </button>
    );
  };

  const staticHeader = (column: ProjectListColumn, label: string) => (
    <div
      className="relative flex shrink-0 items-center px-4 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500"
      style={{ width: columnWidths[column] }}
    >
      {label}
      <ColumnResizeHandle
        column={column}
        resizingColumn={resizingColumn}
        onResizeStart={onResizeStart}
        onResizeMove={onResizeMove}
        onResizeEnd={onResizeEnd}
      />
    </div>
  );

  return (
    <div className="sticky top-0 z-10 flex min-w-max items-center border-b border-neutral-300 bg-kenoo-white py-2">
      {headerBtn("name", "name", "Project")}
      {staticHeader("status", "Status")}
      {headerBtn("progress", "progress", "Progress")}
      {staticHeader("tasks", "Tasks")}
      {headerBtn("due_date", "due_date", "Due date")}
      {staticHeader("actions", "")}
    </div>
  );
}

function ColumnResizeHandle({
  column,
  resizingColumn,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: {
  column: ProjectListColumn;
  resizingColumn: ProjectListColumn | null;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>, key: ProjectListColumn) => void;
  onResizeMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeEnd: () => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${column} column`}
      onPointerDown={(event) => onResizeStart(event, column)}
      onPointerMove={onResizeMove}
      onPointerUp={onResizeEnd}
      onPointerCancel={onResizeEnd}
      onClick={(event) => event.stopPropagation()}
      className="absolute right-0 top-0 z-20 h-full w-3 cursor-col-resize touch-none"
    >
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-px transition-colors",
          resizingColumn === column ? "bg-neutral-500" : "bg-neutral-300 group-hover:bg-neutral-400"
        )}
      />
    </div>
  );
}

/* ─── Due date ──────────────────────────────────────────────────────────── */
function DueDateLabel({
  date,
  status,
}: {
  date: string | null;
  status: ProjectStatus;
}) {
  if (!date) return <span className="text-xs text-neutral-300 font-light">—</span>;
  const d = new Date(date);
  const now = new Date();
  const isOverdue =
    d < now && status !== "completed" && status !== "cancelled";
  const formatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <span
      className={cn(
        "text-xs font-light flex items-center gap-1",
        isOverdue ? "text-red-500" : "text-neutral-500"
      )}
    >
      <Calendar className="h-3 w-3 flex-shrink-0" />
      {formatted}
    </span>
  );
}

/* ─── Project row ────────────────────────────────────────────────────────── */
interface ProjectRowProps {
  project: ProjectWithStats;
  index: number;
  onEdit: (p: Project) => void;
  columnWidths: Record<ProjectListColumn, number>;
  tableWidth: number;
}

function ProjectRow({ project, index, onEdit, columnWidths, tableWidth }: ProjectRowProps) {
  const cfg = PROJECT_STATUS_CONFIG[project.status];
  const pct =
    project.task_count === 0
      ? 0
      : Math.round((project.done_count / project.task_count) * 100);
  const router = useRouter();
  const [showDescription, setShowDescription] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, delay: index * 0.025, ease: [0.4, 0, 0.2, 1] }}
      role="button"
      tabIndex={0}
      onClick={() => onEdit(project)}
      onKeyDown={(e) => e.key === "Enter" && onEdit(project)}
      className="group flex min-w-max cursor-pointer items-stretch border-b border-neutral-300 bg-kenoo-white transition-colors duration-200 hover:bg-gray-200/60 focus-visible:bg-gray-200/60 focus-visible:outline-none"
      style={{ minWidth: tableWidth }}
    >
      {/* Name + description */}
      <div className="flex shrink-0 items-center gap-2 px-6 py-3" style={{ width: columnWidths.name }}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: project.color ?? cfg.accent }} aria-hidden />
        <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-light text-neutral-600">
            {project.name}
          </span>
        </div>
        {project.description && (
          <div className="mt-0">
            <button
              type="button"
              className="text-[11px] text-neutral-400 font-light hover:text-neutral-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowDescription((prev) => !prev);
              }}
            >
              {showDescription ? "Hide description" : "+ Show description"}
            </button>

            {showDescription && (
              <div className="text-xs text-neutral-400 mt-1 font-light">
                {renderMarkdownPreview(project.description, {
                  textClassName: "text-xs text-neutral-400",
                })}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 overflow-hidden px-4 py-3" style={{ width: columnWidths.status }}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cfg.accent }} />
        <span className="truncate text-sm font-light text-neutral-600">{cfg.label}</span>
      </div>

      {/* Progress bar */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-3" style={{ width: columnWidths.progress }}>
        <div className="min-w-0 flex-1 h-1 rounded-full bg-neutral-200 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              pct === 100 ? "bg-kenoo-yellow" : "bg-kenoo-sky/50"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-500">
          {pct}%
        </span>
      </div>

      {/* Task count */}
      <span className="flex shrink-0 items-center px-4 py-3 text-left text-sm font-light tabular-nums text-neutral-500" style={{ width: columnWidths.tasks }}>
        {project.done_count}/{project.task_count}
      </span>

      {/* Due date */}
      <div className="flex shrink-0 items-center overflow-hidden px-4 py-3" style={{ width: columnWidths.due_date }}>
        <DueDateLabel date={project.due_date} status={project.status} />
      </div>

      {/* Actions — visible on hover */}
      <div
        className="flex shrink-0 items-center justify-end px-4 py-3 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ width: columnWidths.actions }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => router.push(`/tasks?project=${project.id}`)}
          className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-medium hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 transition-colors whitespace-nowrap"
          title="View tasks"
        >
          View tasks <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────────── */
const SKELETON_GROUP_ROWS = [3, 2, 2] as const;

function ProjectsListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading projects">
      {SKELETON_GROUP_ROWS.map((rowCount, groupIdx) => (
        <div key={groupIdx} className="mb-1">
          <div className="flex items-center gap-2 py-2 px-3">
            <Skeleton className="h-3.5 w-3.5 shrink-0 rounded bg-neutral-100" />
            <Skeleton className="h-4 w-20 rounded bg-neutral-100" />
            <Skeleton className="h-4 w-8 rounded bg-neutral-100" />
          </div>
          <div className="flex flex-col gap-0.5 pl-5 pt-0.5">
            {Array.from({ length: rowCount }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-8 px-3 py-2.5"
              >
                <Skeleton className="h-9 w-1 shrink-0 rounded-full bg-neutral-100" />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Skeleton className="h-2 w-2 shrink-0 rounded-full bg-neutral-100" />
                  <Skeleton className="h-4 max-w-[220px] flex-1 rounded bg-neutral-100" />
                </div>
                <Skeleton className="mr-36 hidden h-1 w-40 shrink-0 rounded-full sm:block bg-neutral-100" />
                <Skeleton className="hidden h-4 w-12 shrink-0 rounded md:block bg-neutral-100" />
                <Skeleton className="ml-16 hidden h-4 w-28 shrink-0 rounded lg:block bg-neutral-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Search toolbar ─────────────────────────────────────────────────────── */
function SearchToolbar({
  search,
  onSearch,
  statusFilter,
  onStatusFilterChange,
  onNewProject,
}: {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onNewProject: () => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap mb-5">
      <ProjectsHeader
        filterOnly
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
      />
      <ProjectsHeader newOnly onNewProject={onNewProject} />
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className={cn(
            "w-full pl-6 pr-3 py-2 text-sm bg-transparent border-0 border-b focus:outline-none transition-colors placeholder:text-neutral-300 font-light rounded-none",
            search ? "border-b-[var(--kenoo-sky)]" : "border-neutral-200",
            "focus:border-b-[var(--kenoo-sky)]"
          )}
        />
      </div>
    </div>
  );
}

/* ─── Delete confirm ─────────────────────────────────────────────────────── */
interface DeleteConfirmDialogProps {
  project: Project | null;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirmDialog({
  project,
  onClose,
  onDeleted,
}: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { error: err } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);
      if (err) throw err;
      onDeleted();
      onClose();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!project} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[380px] p-0 gap-0 overflow-hidden rounded-3xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-black tracking-tight uppercase text-neutral-900">
            Delete Project?
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            &ldquo;{project?.name}&rdquo; and all its tasks will be permanently
            deleted. This cannot be undone.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-xl"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-600 text-white hover:bg-red-500"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
interface AgentsProjectsListProps {
  analyticsData: unknown;
}

function AgentsProjectsListContent({
  analyticsData: _analyticsData,
}: AgentsProjectsListProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { activeAccountId, loading: accountLoading } = useActiveAccount();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const initialCachedProjects =
    user && activeAccountId
      ? projectsListCache.get(
          getProjectsListCacheKey({
            userId: user.id,
            accountId: activeAccountId,
            search: "",
            status: "",
          })
        )
      : undefined;
  const [projects, setProjects] = useState<ProjectWithStats[]>(
    () => initialCachedProjects ?? []
  );
  const [loading, setLoading] = useState(() => !initialCachedProjects);
  const loadedCacheKeyRef = useRef<string | null>(
    user && activeAccountId
      ? getProjectsListCacheKey({
          userId: user.id,
          accountId: activeAccountId,
          search: "",
          status: "",
        })
      : null
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [columnWidths, setColumnWidths] = useState(PROJECT_LIST_COLUMN_WIDTHS);
  const [resizingColumn, setResizingColumn] = useState<ProjectListColumn | null>(null);
  const resizeRef = useRef<{
    key: ProjectListColumn;
    startX: number;
    startWidth: number;
  } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadProjects = useCallback(async () => {
    if (authLoading || accountLoading) return;
    if (!user || !activeAccountId) {
      loadedCacheKeyRef.current = null;
      setProjects([]);
      setLoading(false);
      return;
    }
    const cacheKey = getProjectsListCacheKey({
      userId: user.id,
      accountId: activeAccountId,
      search: debouncedSearch,
      status: statusFilter,
    });
    const cached = projectsListCache.get(cacheKey);
    if (cached) {
      loadedCacheKeyRef.current = cacheKey;
      setProjects(cached);
      setLoading(false);
      return;
    }
    loadedCacheKeyRef.current = null;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();

      const { data: memberRows } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id);

      const memberProjectIds = (memberRows ?? []).map((r) => r.project_id);
      const accessFilter =
        memberProjectIds.length > 0
          ? `owner_id.eq.${user.id},id.in.(${memberProjectIds.join(",")})`
          : `owner_id.eq.${user.id}`;

      let query = supabase
        .from("projects")
        .select("*")
        .eq("account_id", activeAccountId)
        .or(accessFilter)
        .order("created_at", { ascending: false });
      if (debouncedSearch) query = query.ilike("name", `%${debouncedSearch}%`);
      if (statusFilter) query = query.eq("status", statusFilter);
      const { data: projectRows, error } = await query;
      if (error) throw error;
      const rows = (projectRows ?? []) as Project[];
      if (rows.length === 0) {
        setProjects([]);
        return;
      }
      const projectIds = rows.map((p) => p.id);
      const { data: taskCounts } = await supabase
        .from("project_tasks")
        .select(
          "project_id, status, is_private, assigned_by, task_assignees:project_task_assignees(user_id)"
        )
        .in("project_id", projectIds);
      const countMap = new Map<string, { total: number; done: number }>();
      for (const t of taskCounts ?? []) {
        const links = (
          t as {
            task_assignees?: { user_id: string }[] | null;
          }
        ).task_assignees;
        const fromJoin = (links ?? []).map((l) => l.user_id).filter(Boolean);
        const assignee_ids = fromJoin;
        if (
          !isTaskVisibleToUser(
            {
              is_private: Boolean(t.is_private),
              assigned_by: (t.assigned_by as string | null) ?? null,
              assignee_ids,
            },
            user.id
          )
        ) {
          continue;
        }
        if (!countMap.has(t.project_id))
          countMap.set(t.project_id, { total: 0, done: 0 });
        const entry = countMap.get(t.project_id)!;
        entry.total += 1;
        if (t.status === "completed") entry.done += 1;
      }
      const loadedProjects = rows.map((p) => ({
          ...p,
          task_count: countMap.get(p.id)?.total ?? 0,
          done_count: countMap.get(p.id)?.done ?? 0,
        }));
      projectsListCache.set(cacheKey, loadedProjects);
      loadedCacheKeyRef.current = cacheKey;
      setProjects(loadedProjects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, accountLoading, activeAccountId, debouncedSearch, statusFilter, refreshTrigger]);

  useEffect(() => {
    if (authLoading || accountLoading) return;
    loadProjects();
  }, [loadProjects, authLoading, accountLoading]);

  useEffect(() => {
    if (!user || !activeAccountId) return;
    const cacheKey = getProjectsListCacheKey({
      userId: user.id,
      accountId: activeAccountId,
      search: debouncedSearch,
      status: statusFilter,
    });
    if (loadedCacheKeyRef.current !== cacheKey) return;
    projectsListCache.set(
      cacheKey,
      projects
    );
  }, [user, activeAccountId, debouncedSearch, statusFilter, projects]);

  const refresh = () => {
    if (user && activeAccountId) {
      projectsListCache.delete(
        getProjectsListCacheKey({
          userId: user.id,
          accountId: activeAccountId,
          search: debouncedSearch,
          status: statusFilter,
        })
      );
    }
    setRefreshTrigger((r) => r + 1);
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const handleResizeStart = (
    event: React.PointerEvent<HTMLDivElement>,
    key: ProjectListColumn
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key],
    };
    setResizingColumn(key);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    const nextWidth = Math.max(
      PROJECT_LIST_MIN_COLUMN_WIDTHS[resize.key],
      resize.startWidth + event.clientX - resize.startX
    );
    setColumnWidths((current) => ({ ...current, [resize.key]: nextWidth }));
  };

  const handleResizeEnd = () => {
    resizeRef.current = null;
    setResizingColumn(null);
  };

  const sortProjects = useCallback(
    (list: ProjectWithStats[]): ProjectWithStats[] =>
      [...list].sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "priority":
            cmp = (a.priority ?? 99) - (b.priority ?? 99);
            break;
          case "due_date":
            if (!a.due_date && !b.due_date) cmp = 0;
            else if (!a.due_date) cmp = 1;
            else if (!b.due_date) cmp = -1;
            else
              cmp =
                new Date(a.due_date).getTime() -
                new Date(b.due_date).getTime();
            break;
          case "progress": {
            const ap =
              a.task_count === 0 ? 0 : a.done_count / a.task_count;
            const bp =
              b.task_count === 0 ? 0 : b.done_count / b.task_count;
            cmp = ap - bp;
            break;
          }
        }
        return sortDir === "asc" ? cmp : -cmp;
      }),
    [sortBy, sortDir]
  );

  const openEdit = (p: Project) => {
    setEditProject(p);
    setFormOpen(true);
  };

  const sortedProjects = sortProjects(projects);
  const showLoading = authLoading || loading;
  const tableWidth = Object.values(columnWidths).reduce(
    (total, width) => total + width,
    0
  );

  return (
    <>
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 w-full flex flex-col min-h-0">
          <div className="app-sidebar-pad flex flex-1 flex-col min-h-0 overflow-hidden pr-4 md:pr-6">
            <div className="relative z-50 flex-shrink-0">
              <ProjectsHeader
                hideHeaderFilter
                hideHeaderNewActions
                onNewProject={() => {
                  setEditProject(null);
                  setFormOpen(true);
                }}
                onNewTask={() => setTaskFormOpen(true)}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            </div>

            <div className="relative z-0 flex min-h-0 flex-1 flex-col">
              <div className="mt-2 flex-shrink-0">
                <SearchToolbar
                  search={search}
                  onSearch={setSearch}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onNewProject={() => {
                    setEditProject(null);
                    setFormOpen(true);
                  }}
                />
              </div>

              {/* List body scrolls; column headers stick within this region */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-none pb-10">
                {showLoading ? (
                  <>
                    <ColumnHeaders
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      columnWidths={columnWidths}
                      resizingColumn={resizingColumn}
                      onResizeStart={handleResizeStart}
                      onResizeMove={handleResizeMove}
                      onResizeEnd={handleResizeEnd}
                    />
                    <ProjectsListSkeleton />
                  </>
                ) : projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-neutral-200/80 flex items-center justify-center mb-4">
                      <FolderOpen className="h-8 w-8 text-neutral-400" />
                    </div>
                    <p className="text-neutral-600 font-medium">No projects found</p>
                    <p className="text-sm text-neutral-500 mt-1 max-w-sm">
                      {debouncedSearch || statusFilter
                        ? "Try adjusting your search or filter."
                        : "Create your first project to start tracking tasks and progress."}
                    </p>
                    {!debouncedSearch && !statusFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditProject(null);
                          setFormOpen(true);
                        }}
                        className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        New project
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <ColumnHeaders
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      columnWidths={columnWidths}
                      resizingColumn={resizingColumn}
                      onResizeStart={handleResizeStart}
                      onResizeMove={handleResizeMove}
                      onResizeEnd={handleResizeEnd}
                    />
                    <div className="min-w-max bg-kenoo-white" style={{ minWidth: tableWidth }}>
                      {sortedProjects.map((project, index) => (
                        <ProjectRow
                          key={project.id}
                          project={project}
                          index={index}
                          onEdit={openEdit}
                          columnWidths={columnWidths}
                          tableWidth={tableWidth}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateProjectsPopup
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditProject(null);
        }}
        onSaved={refresh}
        existing={editProject}
      />

      <CreateTasksPopup
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        onSaved={refresh}
        projects={projects}
      />

    </>
  );
}

export default function AgentsProjectsList(props: AgentsProjectsListProps) {
  return <AgentsProjectsListContent {...props} />;
}
