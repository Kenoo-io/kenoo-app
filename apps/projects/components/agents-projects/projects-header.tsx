"use client";

import { useAuth } from "@walls/auth";
import { useActiveAccount } from "@/components/active-account-context";
import {
  ACCESSIBLE_PROJECT_SELECT,
  loadAccessibleProjects,
} from "./load-accessible-projects";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Filter, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  Project,
  ProjectStatus,
  PROJECT_STATUS_CONFIG,
  PROJECT_STATUS_OPTIONS,
  BoardTaskScope,
  BOARD_TASK_SCOPE_CONFIG,
  PRIORITY_CONFIG,
  type TaskAssignee,
} from "./types";

const FILTER_SELECT_TRIGGER =
  "h-11 rounded-full border border-transparent bg-transparent px-4 text-sm font-light text-neutral-700 [&>svg]:hidden hover:bg-neutral-100 transition-all duration-300 ease-in-out focus:ring-0 focus-visible:ring-0";

const FILTER_MENU_CONTENT =
  "z-[10000] w-[272px] rounded-[15px] border-0 bg-white/90 p-1 font-light shadow-md backdrop-blur-xl";

const DUE_DATE_LABELS = {
  all: "—",
  overdue: "Overdue",
  today: "Due today",
  next_7_days: "Due in the next 7 days",
  no_due_date: "No due date",
} as const;

export type ProjectsBoardFiltersProps = {
  projects?: Project[];
  projectFilter?: string;
  onProjectFilterChange: (value: string) => void;
  projectStatusFilter?: ProjectStatus[];
  taskScopeOptions?: BoardTaskScope[];
  taskScopeFilter?: BoardTaskScope;
  onTaskScopeFilterChange?: (value: BoardTaskScope) => void;
  assignees?: TaskAssignee[];
  assigneeFilter?: string[];
  onAssigneeFilterChange?: (value: string[]) => void;
  priorityFilter?: number[];
  onPriorityFilterChange?: (value: number[]) => void;
  dueDateFilter?: "all" | "overdue" | "today" | "next_7_days" | "no_due_date";
  onDueDateFilterChange?: (
    value: "all" | "overdue" | "today" | "next_7_days" | "no_due_date",
  ) => void;
  className?: string;
};

/** Task filters, using the same slide-out filter pattern as CRM. */
export function ProjectsBoardFilters({
  projects,
  projectFilter,
  onProjectFilterChange,
  projectStatusFilter,
  taskScopeOptions = [],
  taskScopeFilter = "project",
  onTaskScopeFilterChange,
  assignees = [],
  assigneeFilter = [],
  onAssigneeFilterChange,
  priorityFilter = [],
  onPriorityFilterChange,
  dueDateFilter = "all",
  onDueDateFilterChange,
  className,
}: ProjectsBoardFiltersProps) {
  const { user } = useAuth();
  const { activeAccountId, loading: accountLoading } = useActiveAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [accessibleProjects, setAccessibleProjects] = useState<Project[]>([]);
  const [loadingAccessibleProjects, setLoadingAccessibleProjects] = useState(false);

  const showTaskScopeDropdown =
    !!onTaskScopeFilterChange && taskScopeOptions.length > 1;
  const defaultTaskScope = taskScopeOptions.includes("project")
    ? "project"
    : (taskScopeOptions[0] ?? "mine");
  const hasActiveFilters =
    projectFilter !== "all" ||
    taskScopeFilter !== defaultTaskScope ||
    assigneeFilter.length > 0 ||
    priorityFilter.length > 0 ||
    dueDateFilter !== "all";

  const toggleAssignee = (id: string) => {
    onAssigneeFilterChange?.(
      assigneeFilter.includes(id)
        ? assigneeFilter.filter((value) => value !== id)
        : [...assigneeFilter, id],
    );
  };

  const togglePriority = (priority: number) => {
    onPriorityFilterChange?.(
      priorityFilter.includes(priority)
        ? priorityFilter.filter((value) => value !== priority)
        : [...priorityFilter, priority],
    );
  };

  useEffect(() => {
    if (!user?.id || !activeAccountId || accountLoading) {
      setAccessibleProjects([]);
      setLoadingAccessibleProjects(false);
      return;
    }

    let cancelled = false;
    setLoadingAccessibleProjects(true);
    const run = async () => {
      try {
        const data = await loadAccessibleProjects(user.id, {
          accountId: activeAccountId,
          select: ACCESSIBLE_PROJECT_SELECT.summary,
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
  }, [user?.id, activeAccountId, accountLoading]);

  const filterProjects = useMemo(() => {
    const source =
      accessibleProjects.length > 0 || !loadingAccessibleProjects
        ? accessibleProjects
        : (projects ?? []);
    if (!projectStatusFilter?.length) return source;
    const allowed = new Set(projectStatusFilter);
    return source.filter((p) => allowed.has(p.status));
  }, [
    accessibleProjects,
    loadingAccessibleProjects,
    projects,
    projectStatusFilter,
  ]);

  useEffect(() => {
    if (loadingAccessibleProjects) return;
    if (!projectFilter || projectFilter === "all") return;
    if (filterProjects.some((p) => p.id === projectFilter)) return;
    onProjectFilterChange("all");
  }, [
    onProjectFilterChange,
    projectFilter,
    filterProjects,
    loadingAccessibleProjects,
  ]);

  const selectedProject = filterProjects.find((p) => p.id === projectFilter);
  const assigneeFilterLabel =
    assigneeFilter.length === 0
      ? "—"
      : assigneeFilter.length > 1
        ? `${assigneeFilter.length} selected`
        : assigneeFilter[0] === "unassigned"
          ? "Unassigned"
          : (() => {
              const assignee = assignees.find((item) => item.id === assigneeFilter[0]);
              return assignee
                ? `${assignee.first_name ?? ""} ${assignee.last_name ?? ""}`.trim() || assignee.email
                : "—";
            })();

  const filterPanel = (
    <AnimatePresence>
      {isOpen ? (
    <motion.aside
      initial={{ opacity: 0, x: -28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -28 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-y-0 left-0 z-[9999] flex w-80 flex-col border-r border-white/30 bg-white/80 shadow-2xl backdrop-blur-xl"
      aria-label="Task filters"
    >
      <div className="flex items-center justify-between border-b border-black/10 bg-white/80 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-black" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold text-black">Filters</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="cursor-pointer transition-opacity duration-300 hover:opacity-70"
          aria-label="Close filters"
        >
          <X className="h-[18px] w-[18px] text-black" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="space-y-6">
          {showTaskScopeDropdown ? (
            <Select value={taskScopeFilter} onValueChange={(value) => onTaskScopeFilterChange?.(value as BoardTaskScope)}>
              <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                <span><span className="text-neutral-700">Tasks:</span>{" "}{taskScopeFilter === defaultTaskScope ? "—" : BOARD_TASK_SCOPE_CONFIG[taskScopeFilter].menuLabel}</span>
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {taskScopeOptions.map((scope) => <SelectItem key={scope} value={scope}>{BOARD_TASK_SCOPE_CONFIG[scope].menuLabel}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}

          <Select value={projectFilter || "all"} onValueChange={onProjectFilterChange}>
            <SelectTrigger className={FILTER_SELECT_TRIGGER}>
              <span><span className="text-neutral-700">Project:</span>{" "}{selectedProject?.name ?? "—"}</span>
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              <SelectItem value="all">—</SelectItem>
              {loadingAccessibleProjects && filterProjects.length === 0 ? <SelectItem value="loading" disabled>Loading projects…</SelectItem> : null}
              {filterProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {onAssigneeFilterChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn("flex w-full items-center justify-between", FILTER_SELECT_TRIGGER)}>
                  <span><span className="text-neutral-700">Assignee:</span> {assigneeFilterLabel}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={FILTER_MENU_CONTENT}>
                <DropdownMenuCheckboxItem checked={assigneeFilter.length === 0} onCheckedChange={() => onAssigneeFilterChange([])}>—</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={assigneeFilter.includes("unassigned")} onCheckedChange={() => toggleAssignee("unassigned")}>Unassigned</DropdownMenuCheckboxItem>
                {assignees.map((assignee) => {
                  const name = `${assignee.first_name ?? ""} ${assignee.last_name ?? ""}`.trim() || assignee.email;
                  return <DropdownMenuCheckboxItem key={assignee.id} checked={assigneeFilter.includes(assignee.id)} onCheckedChange={() => toggleAssignee(assignee.id)}>{name}</DropdownMenuCheckboxItem>;
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {onPriorityFilterChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn("flex w-full items-center justify-between", FILTER_SELECT_TRIGGER)}>
                  <span><span className="text-neutral-700">Priority:</span> {priorityFilter.length ? `${priorityFilter.length} selected` : "—"}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={FILTER_MENU_CONTENT}>
                <DropdownMenuCheckboxItem checked={priorityFilter.length === 0} onCheckedChange={() => onPriorityFilterChange([])}>—</DropdownMenuCheckboxItem>
                {Object.entries(PRIORITY_CONFIG).map(([value, config]) => {
                  const priority = Number(value);
                  return <DropdownMenuCheckboxItem key={priority} checked={priorityFilter.includes(priority)} onCheckedChange={() => togglePriority(priority)}>{config.label}</DropdownMenuCheckboxItem>;
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {onDueDateFilterChange ? (
            <Select value={dueDateFilter} onValueChange={(value) => onDueDateFilterChange(value as typeof dueDateFilter)}>
              <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                <span><span className="text-neutral-700">Due date:</span>{" "}{DUE_DATE_LABELS[dueDateFilter]}</span>
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                <SelectItem value="all">—</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="next_7_days">Due in the next 7 days</SelectItem>
                <SelectItem value="no_due_date">No due date</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-black/10 p-6">
        <button
          type="button"
          onClick={() => {
            onProjectFilterChange("all");
            onTaskScopeFilterChange?.(defaultTaskScope);
            onAssigneeFilterChange?.([]);
            onPriorityFilterChange?.([]);
            onDueDateFilterChange?.("all");
          }}
          className="inline-flex h-9 items-center rounded-full px-3 text-sm font-light text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          <span className="leading-none">Reset filters</span>
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100"
        >
          <span className="leading-none">Done</span>
        </button>
      </div>
    </motion.aside>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open task filters"
        aria-pressed={isOpen}
        className={cn(
          "group flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-all duration-300 hover:bg-neutral-100",
          hasActiveFilters && "shadow-[0_0_0_1px_rgba(110,173,192,0.4),0_0_12px_rgba(110,173,192,0.4)]",
          className,
        )}
      >
        <Filter className="h-[18px] w-[18px] stroke-[1.5]" />
      </button>

      {filterPanel && typeof document !== "undefined"
        ? createPortal(filterPanel, document.body)
        : null}
    </>
  );
}

interface ProjectsHeaderProps {
  onNewProject?: () => void;
  onNewTask?: () => void;
  projects?: Project[];
  projectFilter?: string;
  onProjectFilterChange?: (value: string) => void;
  /** When set, only projects with these statuses appear in the project dropdown. */
  projectStatusFilter?: ProjectStatus[];
  taskScopeOptions?: BoardTaskScope[];
  taskScopeFilter?: BoardTaskScope;
  onTaskScopeFilterChange?: (value: BoardTaskScope) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  /**
   * When true, omit My Tasks / All Projects from the title row so the parent
   * can place them elsewhere (e.g. the tasks search toolbar).
   */
  hideBoardFilters?: boolean;
  /** Render only the filter trigger, for toolbars that own its placement. */
  filterOnly?: boolean;
}

export function ProjectsHeader({
  onNewProject,
  onNewTask,
  projects,
  projectFilter,
  onProjectFilterChange,
  projectStatusFilter,
  taskScopeOptions = [],
  taskScopeFilter = "project",
  onTaskScopeFilterChange,
  statusFilter,
  onStatusFilterChange,
  hideBoardFilters = false,
  filterOnly = false,
}: ProjectsHeaderProps) {
  const { user } = useAuth();
  const { activeAccountId, loading: accountLoading } = useActiveAccount();
  const pathname = usePathname();
  const isBoard = pathname.startsWith("/tasks");
  const isTimeline = pathname.startsWith("/timeline");
  const isList = pathname.startsWith("/projects");

  const pageLabel = isBoard
    ? "Tasks"
    : isTimeline
      ? "Timeline"
      : isList
        ? "Projects"
        : "Overview";

  const [headerFiltersOpen, setHeaderFiltersOpen] = useState(false);
  const [accessibleProjects, setAccessibleProjects] = useState<Project[]>([]);
  const [loadingAccessibleProjects, setLoadingAccessibleProjects] = useState(false);

  const showBoardFiltersInHeader =
    isBoard &&
    !hideBoardFilters &&
    (!!onTaskScopeFilterChange || !!onProjectFilterChange);

  const showProjectFilter = !isBoard && !!onProjectFilterChange;

  useEffect(() => {
    if (!showProjectFilter || !user?.id || !activeAccountId || accountLoading) {
      setAccessibleProjects([]);
      setLoadingAccessibleProjects(false);
      return;
    }

    let cancelled = false;
    setLoadingAccessibleProjects(true);
    const run = async () => {
      try {
        const data = await loadAccessibleProjects(user.id, {
          accountId: activeAccountId,
          select: ACCESSIBLE_PROJECT_SELECT.summary,
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
  }, [showProjectFilter, user?.id, activeAccountId, accountLoading]);

  const filterProjects = useMemo(() => {
    const source =
      accessibleProjects.length > 0 || !loadingAccessibleProjects
        ? accessibleProjects
        : (projects ?? []);
    if (!projectStatusFilter?.length) return source;
    const allowed = new Set(projectStatusFilter);
    return source.filter((p) => allowed.has(p.status));
  }, [
    accessibleProjects,
    loadingAccessibleProjects,
    projects,
    projectStatusFilter,
  ]);

  useEffect(() => {
    if (!showProjectFilter || !onProjectFilterChange) return;
    if (loadingAccessibleProjects) return;
    if (!projectFilter || projectFilter === "all") return;
    if (filterProjects.some((p) => p.id === projectFilter)) return;
    onProjectFilterChange("all");
  }, [
    showProjectFilter,
    onProjectFilterChange,
    projectFilter,
    filterProjects,
    loadingAccessibleProjects,
  ]);

  const showStatusFilter = !!onStatusFilterChange;
  const selectedHeaderProject = filterProjects.find((p) => p.id === projectFilter);
  const hasHeaderFilters =
    (showProjectFilter && projectFilter !== "all") ||
    (showStatusFilter && !!statusFilter);

  const headerFilterPanel = (
    <AnimatePresence>
      {headerFiltersOpen ? (
        <motion.aside
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-y-0 left-0 z-[9999] flex w-80 flex-col border-r border-white/30 bg-white/80 shadow-2xl backdrop-blur-xl"
          aria-label="Project filters"
        >
          <div className="flex items-center justify-between border-b border-black/10 bg-white/80 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-black" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-black">Filters</h2>
            </div>
            <button type="button" onClick={() => setHeaderFiltersOpen(false)} className="cursor-pointer transition-opacity duration-300 hover:opacity-70" aria-label="Close filters">
              <X className="h-[18px] w-[18px] text-black" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {showProjectFilter ? (
                <Select value={projectFilter || "all"} onValueChange={onProjectFilterChange}>
                  <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                    <span><span className="text-neutral-700">Project:</span>{" "}{selectedHeaderProject?.name ?? "—"}</span>
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="all">—</SelectItem>
                    {loadingAccessibleProjects && filterProjects.length === 0 ? <SelectItem value="loading" disabled>Loading projects…</SelectItem> : null}
                    {filterProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}

              {showStatusFilter ? (
                <Select value={statusFilter || "all"} onValueChange={(value) => onStatusFilterChange?.(value === "all" ? "" : value)}>
                  <SelectTrigger className={FILTER_SELECT_TRIGGER}>
                    <span><span className="text-neutral-700">Status:</span>{" "}{statusFilter ? PROJECT_STATUS_CONFIG[statusFilter as ProjectStatus]?.label : "—"}</span>
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="all">—</SelectItem>
                    {PROJECT_STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{PROJECT_STATUS_CONFIG[status].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-black/10 p-6">
            <button type="button" onClick={() => { onProjectFilterChange?.("all"); onStatusFilterChange?.(""); }} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-light text-neutral-700 transition-colors hover:bg-neutral-100"><span className="leading-none">Reset filters</span></button>
            <button type="button" onClick={() => setHeaderFiltersOpen(false)} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100"><span className="leading-none">Done</span></button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );

  const filterButton = (
    <button
      type="button"
      onClick={() => setHeaderFiltersOpen(true)}
      aria-label="Open project filters"
      aria-pressed={headerFiltersOpen}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-all duration-300 hover:bg-neutral-100",
        hasHeaderFilters && "shadow-[0_0_0_1px_rgba(110,173,192,0.4),0_0_12px_rgba(110,173,192,0.4)]",
      )}
    >
      <Filter className="h-[18px] w-[18px] stroke-[1.5]" />
    </button>
  );

  if (filterOnly) {
    return <>{filterButton}{typeof document !== "undefined" ? createPortal(headerFilterPanel, document.body) : null}</>;
  }

  return (
    <>
    <div className="relative z-50 w-full bg-transparent h-auto py-3 px-5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: label + filters */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-x-1.5 min-w-0 flex-wrap">
            {showBoardFiltersInHeader && onProjectFilterChange ? (
              <ProjectsBoardFilters
                projects={projects}
                projectFilter={projectFilter}
                onProjectFilterChange={onProjectFilterChange}
                projectStatusFilter={projectStatusFilter}
                taskScopeOptions={taskScopeOptions}
                taskScopeFilter={taskScopeFilter}
                onTaskScopeFilterChange={onTaskScopeFilterChange}
              />
            ) : hideBoardFilters || showProjectFilter || showStatusFilter ? null : (
              <span className="text-sm md:text-base font-light uppercase tracking-wider text-neutral-800">
                {pageLabel}
              </span>
            )}

            {!showBoardFiltersInHeader && !hideBoardFilters && (showProjectFilter || showStatusFilter)
              ? filterButton
              : null}
          </div>
        </div>

        {/* Right: new dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(onNewProject || onNewTask) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  title="New"
                  className="w-10 h-10 p-0 text-slate-600 hover:bg-transparent flex items-center justify-center shadow-none relative group flex-shrink-0 outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0"
                >
                  <div className="relative">
                    <div className="relative z-10 p-3 rounded-full border-0 transition-all duration-300 ease-in-out group-hover:bg-neutral-100">
                      <Plus className="h-[18px] w-[18px] stroke-[1.5] text-neutral-500" />
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem] rounded-xl">
                {onNewProject && (
                  <DropdownMenuItem
                    onSelect={onNewProject}
                    className="cursor-pointer focus:bg-neutral-100"
                  >
                    New project
                  </DropdownMenuItem>
                )}
                {onNewTask && (
                  <DropdownMenuItem
                    onSelect={onNewTask}
                    className="cursor-pointer focus:bg-neutral-100"
                  >
                    New task
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
    {typeof document !== "undefined" ? createPortal(headerFilterPanel, document.body) : null}
    </>
  );
}
