"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "@walls/auth";
import { getSupabaseClient } from "@walls/auth";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  Circle,
  Timer,
  AlertTriangle,
  GanttChartSquare,
  X,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveAccount } from "@/components/active-account-context";
import { ProjectsHeader } from "../projects-header";
import { SegmentToggle } from "@/components/ui/segment-toggle";
import {
  ACCESSIBLE_PROJECT_SELECT,
  loadAccessibleProjects,
} from "../load-accessible-projects";
import { filterTasksVisibleToUser } from "../task-visibility";
import {
  Project,
  ProjectTask,
  TaskStatus,
  TASK_STATUS_CONFIG,
  PROJECT_STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@walls/ui/slider";
import {
  addDays,
  differenceInDays,
  format,
  isToday,
  isSameDay,
  parseISO,
  startOfDay,
  endOfDay,
  isWithinInterval,
  clamp,
} from "date-fns";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const DEFAULT_DAY_WIDTH = 72;
const MIN_DAY_WIDTH = 28;
const MAX_DAY_WIDTH = 96;
const ROW_HEIGHT = 124; // px per row
const BAR_HEIGHT = 68; // px for the project/task bar

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function parseDateSafe(d: string | null): Date | null {
  if (!d) return null;
  try {
    const parsed = startOfDay(parseISO(d));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  } catch {
    // Fall through to the native parser for timestamp values that are not
    // accepted by date-fns' strict ISO parser.
  }

  const fallback = startOfDay(new Date(d));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Resolve the full date range shown for a project row. Project dates are the
 * baseline, and task dates expand either edge when they fall outside it.
 * A task with only one date contributes that date to both sides of its range.
 */
function getProjectDateRange(
  project: Project,
  projectTasks: ProjectTask[],
): { start: Date | null; end: Date | null } {
  let start = parseDateSafe(project.start_date);
  let end = parseDateSafe(project.due_date);

  for (const task of projectTasks) {
    const taskStart = parseDateSafe(task.start_date || task.due_date);
    const taskEnd = parseDateSafe(task.due_date || task.start_date);

    if (taskStart && (!start || taskStart < start)) start = taskStart;
    if (taskEnd && (!end || taskEnd > end)) end = taskEnd;
  }

  return { start, end };
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function isDueSoon(date: string | null): boolean {
  if (!date) return false;
  const diff = new Date(date).getTime() - Date.now();
  return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000;
}

/** Start the scrollable canvas at the earliest date the user can access. */
function getTimelineContentStart(
  projects: Project[],
  tasks: ProjectTask[],
): Date {
  const today = startOfDay(new Date());
  let earliestDate: Date | null = null;

  for (const project of projects) {
    for (const value of [project.start_date, project.due_date]) {
      const date = parseDateSafe(value);
      if (date && (!earliestDate || date < earliestDate)) earliestDate = date;
    }
  }
  for (const task of tasks) {
    for (const value of [task.start_date, task.due_date]) {
      const date = parseDateSafe(value);
      if (date && (!earliestDate || date < earliestDate)) earliestDate = date;
    }
  }

  return earliestDate && earliestDate < today ? earliestDate : today;
}

/* ─── View mode types ─────────────────────────────────────────────────────── */
type GanttMode = "project" | "task";

/* ─── Gantt bar positioning ───────────────────────────────────────────────── */
interface BarPosition {
  left: number;
  width: number;
  clamped: boolean;
}

function getBarPosition(
  startDate: Date | null,
  endDate: Date | null,
  timelineStart: Date,
  totalDays: number,
  dayWidth: number,
): BarPosition | null {
  if (!startDate && !endDate) return null;

  const tStart = startDate ?? endDate!;
  const tEnd = endDate ?? startDate!;

  const rawLeft = differenceInDays(tStart, timelineStart);
  const rawRight = differenceInDays(tEnd, timelineStart) + 1;

  if (rawRight < 0 || rawLeft > totalDays) return null;

  const clampedLeft = Math.max(0, rawLeft);
  const clampedRight = Math.min(totalDays, rawRight);
  const clamped = clampedLeft !== rawLeft || clampedRight !== rawRight;

  return {
    left: clampedLeft * dayWidth,
    width: Math.max((clampedRight - clampedLeft) * dayWidth, dayWidth / 2),
    clamped,
  };
}

/* ─── Gantt row types ─────────────────────────────────────────────────────── */
interface BaseGanttRow {
  id: string;
  label: string;
  color: string;
  barPos: BarPosition | null;
  isCompleted: boolean;
  isOverdueFlag: boolean;
  subLabel?: string;
}

interface ProjectGanttRow extends BaseGanttRow {
  // project-level rows have no task-specific fields
}

interface TaskGanttRow extends BaseGanttRow {
  status: TaskStatus;
  priority?: number | null;
  task: ProjectTask;
}

type AnyGanttRow = ProjectGanttRow | TaskGanttRow;

type ProjectsTimelineCacheEntry = {
  projects: Project[];
  tasks: ProjectTask[];
};

const projectsTimelineCache = new Map<string, ProjectsTimelineCacheEntry>();

function getProjectsTimelineCacheKey(userId: string, accountId: string) {
  return `${userId}:${accountId}`;
}

/* ─── Task status icon ───────────────────────────────────────────────────── */
function TaskStatusIcon({ status }: { status: TaskStatus }) {
  if (status === "completed")
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />;
  if (status === "blocked")
    return <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />;
  if (status === "in_progress")
    return <Timer className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />;
  const cfg = TASK_STATUS_CONFIG[status];
  return (
    <Circle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cfg.accent }} />
  );
}

/* ─── Task detail dialog ─────────────────────────────────────────────────── */
const TASK_STATUS_OPTIONS: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "on_hold",
  "completed",
  "blocked",
];

function TaskDetailDialog({
  task,
  onClose,
  onStatusChange,
}: {
  task: ProjectTask | null;
  onClose: () => void;
  onStatusChange: (task: ProjectTask, status: TaskStatus) => void;
}) {
  if (!task) return null;
  const statusCfg = TASK_STATUS_CONFIG[task.status];
  const priorityCfg = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const overdue = isOverdue(task.due_date) && task.status !== "completed";

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px] p-0 gap-0 overflow-hidden rounded-3xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <DialogTitle className="text-base font-black tracking-tight uppercase text-neutral-900 leading-snug">
            {task.title}
          </DialogTitle>
          {task.project && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: task.project.color ?? "#ceff00" }}
              />
              <span className="text-xs text-neutral-500 font-light">
                {task.project.name}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {TASK_STATUS_OPTIONS.map((s) => {
                const cfg = TASK_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStatusChange(task, s)}
                    className={cn(
                      "text-xs font-medium px-3 py-1 rounded-full uppercase tracking-wider transition-all",
                      task.status === s
                        ? cn(cfg.badge, "ring-2 ring-offset-1 ring-neutral-400")
                        : cn(cfg.badge, "opacity-50 hover:opacity-100")
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-neutral-600 font-light leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {task.start_date && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Start
                </span>
                <span className="font-light text-neutral-700">
                  {format(parseISO(task.start_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
            {task.due_date && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Due
                </span>
                <span className={cn("font-light", overdue ? "text-red-500" : "text-neutral-700")}>
                  {format(parseISO(task.due_date), "MMM d, yyyy")}
                  {overdue && " · Overdue"}
                </span>
              </div>
            )}
            {priorityCfg && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Priority
                </span>
                <span
                  className="font-light flex items-center gap-1.5"
                  style={{ color: priorityCfg.color }}
                >
                  <Flag className="h-3.5 w-3.5" />
                  {priorityCfg.label}
                </span>
              </div>
            )}
            {task.estimated_minutes && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Estimate
                </span>
                <span className="text-neutral-700 font-light">
                  {Math.floor(task.estimated_minutes / 60)}h{" "}
                  {task.estimated_minutes % 60}m
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-end">
          <Button variant="ghost" onClick={onClose} className="rounded-xl text-xs uppercase tracking-wider">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Gantt grid header (dates) ──────────────────────────────────────────── */
function GanttHeader({
  days,
  dayWidth,
}: {
  days: Date[];
  dayWidth: number;
}) {
  // Group days by month
  const months: { label: string; count: number }[] = [];
  let cur = "";
  for (const d of days) {
    const m = format(d, "MMMM yyyy");
    if (m !== cur) {
      months.push({ label: m, count: 1 });
      cur = m;
    } else {
      months[months.length - 1].count++;
    }
  }

  return (
    <div className="border-b border-[#e4e9f0] bg-white">
      {/* Month row */}
      <div className="flex">
        {months.map((m) => (
          <div
            key={m.label}
            className="border-r border-[#edf0f4] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 last:border-r-0"
            style={{ width: m.count * dayWidth }}
          >
            {m.label}
          </div>
        ))}
      </div>
      {/* Day row */}
      <div className="flex">
        {days.map((d) => {
          const today = isToday(d);
          const isSun = d.getDay() === 0;
          const isSat = d.getDay() === 6;
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "flex flex-col items-center justify-center border-r border-[#edf0f4] py-1 last:border-r-0",
                (isSat || isSun) ? "bg-[#fafbfc]" : "",
                today ? "bg-[#4285F4]/10" : ""
              )}
              style={{ width: dayWidth, minWidth: dayWidth }}
            >
              <span
                className={cn(
                  "text-[9px] font-medium uppercase tracking-wider",
                  today ? "text-neutral-900 font-black" : "text-neutral-400"
                )}
              >
                {format(d, "EEE")}
              </span>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  today
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-[#4285F4] font-black text-white"
                    : "text-neutral-500 font-light"
                )}
              >
                {format(d, "d")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Gantt row ──────────────────────────────────────────────────────────── */
function GanttRow({
  label,
  color,
  barPos,
  isCompleted,
  isOverdueFlag,
  totalDays,
  days,
  dayWidth,
  onClick,
  index,
  subLabel,
}: {
  label: string;
  color: string;
  barPos: BarPosition | null;
  isCompleted: boolean;
  isOverdueFlag: boolean;
  totalDays: number;
  days: Date[];
  dayWidth: number;
  onClick?: () => void;
  index: number;
  subLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.015 }}
      className={cn(
        "group relative flex border-b border-[#e4e9f0] last:border-b-0",
        onClick ? "cursor-pointer" : "",
        isCompleted ? "opacity-50" : "",
        isOverdueFlag ? "bg-red-50/30" : "hover:bg-[#fafbfc]"
      )}
      style={{ height: ROW_HEIGHT }}
      onClick={onClick}
    >
      {/* Grid + bar */}
      <div
        className="relative flex w-full"
        style={{ width: totalDays * dayWidth }}
      >
        {/* Day columns */}
        {days.map((d) => {
          const today = isToday(d);
          const isSun = d.getDay() === 0;
          const isSat = d.getDay() === 6;
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "h-full shrink-0 border-r border-[#edf0f4] last:border-r-0",
                (isSat || isSun) ? "bg-[#fafbfc]" : "",
                today ? "bg-[#4285F4]/5" : ""
              )}
              style={{ width: dayWidth }}
            />
          );
        })}

        {/* Bar */}
        {barPos && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-neutral-200/80 bg-white/95",
              "transition-all duration-150",
              onClick ? "group-hover:-translate-y-[calc(50%+1px)] group-hover:shadow-md" : ""
            )}
            style={{
              left: barPos.left,
              width: barPos.width,
              height: BAR_HEIGHT,
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
              opacity: isCompleted ? 0.5 : 1,
            }}
            title={label}
          >
            <span
              className="absolute top-1/2 flex -translate-y-1/2 items-center gap-3 whitespace-nowrap"
              style={{
                left: `max(16px, calc(var(--timeline-scroll-left, 0px) - ${barPos.left}px + 16px))`,
              }}
            >
              <span
                className="h-7 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              {barPos.width > 50 && (
                <span className="flex min-w-0 flex-col justify-center truncate leading-tight">
                  <span className="truncate text-xs font-semibold text-neutral-800">{label}</span>
                  {subLabel && (
                    <span className="truncate text-[10px] font-light text-neutral-400">{subLabel}</span>
                  )}
                </span>
              )}
            </span>
          </div>
        )}

        {/* No date indicator */}
        {!barPos && (
          <div className="absolute inset-0 flex items-center">
            <span className="text-xs text-neutral-300 font-light px-3">
              no dates
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Today marker ────────────────────────────────────────────────────────── */
function TodayMarker({
  timelineStart,
  totalDays,
  dayWidth,
  totalHeight,
}: {
  timelineStart: Date;
  totalDays: number;
  dayWidth: number;
  totalHeight: number;
}) {
  const today = startOfDay(new Date());
  const offset = differenceInDays(today, timelineStart);
  if (offset < 0 || offset >= totalDays) return null;

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: offset * dayWidth + dayWidth / 2, width: 1.5 }}
    >
      <div className="h-full bg-[#4285F4] opacity-70" />
      <div
        className="absolute -top-1 w-2.5 -translate-x-1/2 rounded-full bg-[#4285F4]"
        style={{ left: "50%" }}
      />
    </div>
  );
}

/* ─── Toolbar layout ─────────────────────────────────────────────────────── */
const TIMELINE_TOOLBAR_ROW_H = "h-10";

/* ─── Main component ─────────────────────────────────────────────────────── */
interface AgentsProjectsTimelineProps {
  analyticsData: unknown;
}

function AgentsProjectsTimelineContent({
  analyticsData: _analyticsData,
}: AgentsProjectsTimelineProps) {
  const { user } = useAuth();
  const { activeAccountId, loading: accountLoading } = useActiveAccount();
  const initialCachedData =
    user && activeAccountId
      ? projectsTimelineCache.get(
          getProjectsTimelineCacheKey(user.id, activeAccountId)
        )
      : undefined;
  const [projects, setProjects] = useState<Project[]>(
    () => initialCachedData?.projects ?? []
  );
  const [tasks, setTasks] = useState<ProjectTask[]>(
    () => initialCachedData?.tasks ?? []
  );
  const [loading, setLoading] = useState(() => !initialCachedData);
  const loadedCacheKeyRef = useRef<string | null>(
    user && activeAccountId
      ? getProjectsTimelineCacheKey(user.id, activeAccountId)
      : null
  );
  /* view controls */
  const [ganttMode, setGanttMode] = useState<GanttMode>("project");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [viewTask, setViewTask] = useState<ProjectTask | null>(null);

  /* gantt scroll / range */
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedTimeline = useRef(false);
  const [timelineStart, setTimelineStart] = useState<Date>(() => startOfDay(new Date()));
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const totalDays = useMemo(
    () => Math.max(90, differenceInDays(startOfDay(new Date()), timelineStart) + 90),
    [timelineStart]
  );

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
  }, [timelineStart, totalDays]);

  /* Keep the selected starting date at the left edge of the viewport. */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(
        0,
        differenceInDays(startOfDay(new Date()), timelineStart) * dayWidth
      );
      scrollRef.current.style.setProperty(
        "--timeline-scroll-left",
        `${scrollRef.current.scrollLeft}px`
      );
    }
  }, [timelineStart, dayWidth]);

  /* Load data */
  const loadData = useCallback(async () => {
    if (!user || !activeAccountId || accountLoading) {
      loadedCacheKeyRef.current = null;
      setTasks([]);
      setProjects([]);
      setLoading(false);
      return;
    }
    const cacheKey = getProjectsTimelineCacheKey(user.id, activeAccountId);
    const cached = projectsTimelineCache.get(cacheKey);
    if (cached) {
      loadedCacheKeyRef.current = cacheKey;
      setProjects(cached.projects);
      setTasks(cached.tasks);
    }
    loadedCacheKeyRef.current = null;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();

      const loadedProjects = await loadAccessibleProjects(user.id, {
        accountId: activeAccountId,
        select: ACCESSIBLE_PROJECT_SELECT.timeline,
      });
      setProjects(loadedProjects);

      if (loadedProjects.length === 0) {
        setTasks([]);
        return;
      }

      const projectIds = loadedProjects.map((p) => p.id);
      const { data: taskRows, error: taskErr } = await supabase
        .from("project_tasks")
        .select(
          "id, project_id, title, description, status, due_date, start_date, priority, position, parent_task_id, created_at, updated_at, completed_at, assigned_by, is_private, estimated_minutes, actual_minutes, metadata, task_assignees:project_task_assignees(user_id)"
        )
        .in("project_id", projectIds)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (taskErr) throw taskErr;

      const projectMap = new Map(
        loadedProjects.map((p) => [
          p.id,
          { id: p.id, name: p.name, color: p.color },
        ])
      );

      const mappedTasks = (taskRows ?? []).map((row) => {
        const links = (
          row as {
            task_assignees?: { user_id: string }[] | null;
          }
        ).task_assignees;
        const fromJoin = (links ?? []).map((l) => l.user_id).filter(Boolean);
        const assignee_ids = fromJoin;
        const { task_assignees: _ta, ...rest } = row as Record<string, unknown> & {
          task_assignees?: unknown;
        };
        return {
          ...(rest as Omit<ProjectTask, "project">),
          assignee_ids,
        };
      });

      const loadedTasks = filterTasksVisibleToUser(mappedTasks, user.id);
      const tasksWithProjects = loadedTasks.map((t) => ({
          ...t,
          project: projectMap.get(t.project_id),
        }));
      projectsTimelineCache.set(cacheKey, {
        projects: loadedProjects,
        tasks: tasksWithProjects,
      });
      loadedCacheKeyRef.current = cacheKey;
      setTasks(tasksWithProjects);
      // Re-anchor the visible window to the fresh dates. Otherwise a cached
      // snapshot can leave newly dated tasks outside the current 90-day view.
      setTimelineStart(getTimelineContentStart(loadedProjects, tasksWithProjects));
      hasInitializedTimeline.current = true;
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeAccountId, accountLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user || !activeAccountId) return;
    const cacheKey = getProjectsTimelineCacheKey(user.id, activeAccountId);
    if (loadedCacheKeyRef.current !== cacheKey) return;
    projectsTimelineCache.set(
      cacheKey,
      { projects, tasks }
    );
  }, [user, activeAccountId, projects, tasks]);

  useEffect(() => {
    hasInitializedTimeline.current = false;
  }, [activeAccountId]);

  useEffect(() => {
    if (loading || hasInitializedTimeline.current) return;
    setTimelineStart(getTimelineContentStart(projects, tasks));
    hasInitializedTimeline.current = true;
  }, [loading, projects, tasks]);

  /* Status change */
  const handleStatusChange = async (task: ProjectTask, status: TaskStatus) => {
    setViewTask((prev) => (prev ? { ...prev, status } : null));
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status } : t))
    );
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from("project_tasks")
        .update({ status })
        .eq("id", task.id);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  /* Filtered tasks */
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (statusFilter) result = result.filter((t) => t.status === statusFilter);
    if (projectFilter !== "all")
      result = result.filter((t) => t.project_id === projectFilter);
    return result.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [tasks, statusFilter, projectFilter]);

  const filteredProjects = useMemo(() => {
    if (projectFilter !== "all")
      return projects.filter((p) => p.id === projectFilter);
    return projects;
  }, [projects, projectFilter]);

  /* Stats */
  const overdueCount = tasks.filter(
    (t) => isOverdue(t.due_date) && t.status !== "completed"
  ).length;
  const doneCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in_progress"
  ).length;

  /* Gantt data */
  const ganttRows: AnyGanttRow[] = useMemo(() => {
    if (ganttMode === "project") {
      return filteredProjects.map<ProjectGanttRow>((p) => {
        // Project duration should describe the whole project, even when the
        // task list is narrowed by a status filter.
        const projectTasks = tasks.filter((t) => t.project_id === p.id);
        const { start, end } = getProjectDateRange(p, projectTasks);
        const barPos = getBarPosition(start, end, timelineStart, totalDays, dayWidth);
        const done = projectTasks.filter((t) => t.status === "completed").length;
        const pct = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);
        return {
          id: p.id,
          label: p.name,
          color: p.color ?? "#ceff00",
          barPos,
          isCompleted: p.status === "completed",
          isOverdueFlag:
            end ? isOverdue(end.toISOString()) && p.status !== "completed" : false,
          subLabel: `${done}/${projectTasks.length} tasks · ${pct}%`,
        };
      });
    }
    return filteredTasks.map<TaskGanttRow>((t) => {
      const start = parseDateSafe(t.start_date);
      const end = parseDateSafe(t.due_date);
      const barPos = getBarPosition(start, end, timelineStart, totalDays, dayWidth);
      return {
        id: t.id,
        label: t.title,
        color: t.project?.color ?? "#ceff00",
        barPos,
        status: t.status,
        priority: t.priority,
        isCompleted: t.status === "completed",
        isOverdueFlag: isOverdue(t.due_date) && t.status !== "completed",
        subLabel: t.project?.name,
        task: t,
      };
    });
  }, [ganttMode, filteredProjects, filteredTasks, timelineStart, totalDays, tasks, dayWidth]);

  const ganttHeight = ganttRows.length * ROW_HEIGHT;

  return (
    <>
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 w-full flex flex-col min-h-0">
          {/* Fixed header - no page scroll */}
          <div className="flex-none">
            {/* Toolbar — view toggle in a fixed left cluster; grouping collapses beside it */}
            <div
              className={cn(
                "app-sidebar-pad mb-5 flex items-center gap-2.5 pt-3 pr-8",
              )}
            >
              <div className={cn("flex shrink-0 items-center gap-2", TIMELINE_TOOLBAR_ROW_H)}>
                  <div className="w-max shrink-0 whitespace-nowrap">
                    <SegmentToggle<GanttMode>
                      aria-label="Gantt grouping"
                      value={ganttMode}
                      onChange={(v) => setGanttMode(v)}
                      options={[
                        { value: "project", label: "By Project" },
                        { value: "task", label: "By Task" },
                      ]}
                    />
                  </div>
                <div className="ml-2 shrink-0">
                  <ProjectsHeader
                    filterOnly
                    projects={projects}
                    projectFilter={projectFilter}
                    onProjectFilterChange={setProjectFilter}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                  />
                </div>
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden",
                  TIMELINE_TOOLBAR_ROW_H
                )}
              >
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-3 py-2 shadow-sm">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">Scale</span>
                  <Minus className="h-3 w-3 text-[var(--kenoo-sky)]" aria-hidden />
                  <Slider
                    aria-label="Timeline scale"
                    min={MIN_DAY_WIDTH}
                    max={MAX_DAY_WIDTH}
                    step={1}
                    value={[dayWidth]}
                    onValueChange={(value) => setDayWidth(value[0] ?? dayWidth)}
                    className="w-28"
                  />
                  <Plus className="h-3 w-3 text-[var(--kenoo-sky)]" aria-hidden />
                </div>
                {statusFilter && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("")}
                    className="flex shrink-0 items-center gap-1 px-2.5 h-7 rounded-full bg-neutral-900 text-white text-[10px] font-medium uppercase tracking-wider"
                  >
                    {TASK_STATUS_CONFIG[statusFilter as TaskStatus]?.label}
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className={cn("flex shrink-0 items-center justify-end", TIMELINE_TOOLBAR_ROW_H)}>
                <div className="flex w-max shrink-0 items-center gap-1.5 whitespace-nowrap">
                  <button
                    type="button"
                    className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-transparent group"
                    onClick={() => scrollRef.current?.scrollBy({ left: -28 * dayWidth, behavior: "smooth" })}
                  >
                    <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-transparent transition-all duration-300 ease-in-out group-hover:bg-neutral-100">
                      <ChevronLeft className="h-4 w-4 text-neutral-500" />
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-transparent group"
                    onClick={() => {
                      if (scrollRef.current) {
                        scrollRef.current.scrollTo({
                          left: Math.max(
                            0,
                            differenceInDays(startOfDay(new Date()), timelineStart) * dayWidth
                          ),
                          behavior: "smooth",
                        });
                      }
                    }}
                  >
                    <div className="relative z-10 flex h-7 items-center gap-2 rounded-full border border-transparent px-3 text-xs font-medium uppercase tracking-wider text-neutral-500 transition-all duration-300 ease-in-out group-hover:bg-neutral-100">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4285F4]"
                        aria-hidden
                      />
                      Today
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-transparent group"
                    onClick={() => scrollRef.current?.scrollBy({ left: 28 * dayWidth, behavior: "smooth" })}
                  >
                    <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-transparent transition-all duration-300 ease-in-out group-hover:bg-neutral-100">
                      <ChevronRight className="h-4 w-4 text-neutral-500" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable content area - fills remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* ── GANTT VIEW ── */}
            <div className="app-sidebar-pad h-full flex flex-col pr-8">
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-xl bg-neutral-100 animate-pulse" />
                    ))}
                  </div>
                ) : ganttRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[240px] text-center">
                    <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                      <GanttChartSquare className="h-7 w-7 text-neutral-300" />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">No items to display</p>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                      Add start and due dates to your {ganttMode === "project" ? "projects" : "tasks"} to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] bg-white">
                    {/* Single scrollport for x + y so sticky left on row labels shares the same
                        ancestor as the header; a nested overflow-y-only wrapper breaks
                        position: sticky left relative to horizontal scroll. */}
                    <div
                      ref={scrollRef}
                      onScroll={(event) => {
                        event.currentTarget.style.setProperty(
                          "--timeline-scroll-left",
                          `${event.currentTarget.scrollLeft}px`
                        );
                      }}
                      className="overflow-auto overscroll-none flex-1 min-h-0 flex flex-col"
                    >
                      <div
                        style={{
                          width: totalDays * dayWidth,
                          minWidth: totalDays * dayWidth,
                        }}
                        className="flex flex-col"
                      >
                        <div className="sticky top-0 z-30 shrink-0 bg-white shadow-[0_1px_0_#e4e9f0]">
                          <GanttHeader days={days} dayWidth={dayWidth} />
                        </div>
                        <div className="relative flex-shrink-0">
                          <TodayMarker
                            timelineStart={timelineStart}
                            totalDays={totalDays}
                            dayWidth={dayWidth}
                            totalHeight={ganttHeight}
                          />
                          {ganttRows.map((row, i) => {
                            const isTaskRow = (r: AnyGanttRow): r is TaskGanttRow =>
                              "task" in r;
                            return (
                              <GanttRow
                                key={row.id}
                                index={i}
                                label={row.label}
                                color={row.color}
                                barPos={row.barPos}
                                isCompleted={row.isCompleted}
                                isOverdueFlag={row.isOverdueFlag}
                                totalDays={totalDays}
                                days={days}
                                dayWidth={dayWidth}
                                subLabel={row.subLabel}
                                onClick={
                                  isTaskRow(row)
                                    ? () => setViewTask(row.task)
                                    : undefined
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      <TaskDetailDialog
        task={viewTask}
        onClose={() => setViewTask(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}

export default function AgentsProjectsTimeline(
  props: AgentsProjectsTimelineProps
) {
  return <AgentsProjectsTimelineContent {...props} />;
}
