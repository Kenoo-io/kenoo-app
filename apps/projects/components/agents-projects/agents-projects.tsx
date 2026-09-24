"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@walls/auth";
import { getSupabaseClient } from "@walls/auth";
import { motion } from "framer-motion";
import {
  FolderOpen,
  Plus,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { useActiveAccount } from "@/components/active-account-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { loadAccessibleProjects } from "./load-accessible-projects";
import { isTaskVisibleToUser } from "./task-visibility";
import { CreateProjectsPopup } from "./create-projects-popup";
import { CreateTasksPopup } from "./create-tasks-popup";
import {
  Project,
  ProjectWithStats,
  ProjectTask,
  TASK_STATUS_CONFIG,
} from "./types";

/** Primary CTA for creating a project. */
function NewProjectChromeButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
        className
      )}
    >
      <Plus className="h-4 w-4" /> New Project
    </button>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type HubTask = Pick<
  ProjectTask,
  | "id"
  | "project_id"
  | "title"
  | "status"
  | "due_date"
  | "assignees"
  | "assigned_by"
  | "is_private"
  | "priority"
  | "updated_at"
  | "completed_at"
> & {
  assignee_ids?: string[];
  assignee_users?: MemberUser[];
};

type MemberUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
};

type ProjectWithHub = ProjectWithStats & { members: MemberUser[] };

type ProjectsDashboardCacheEntry = {
  projects: ProjectWithHub[];
  tasks: HubTask[];
};

const projectsDashboardCache = new Map<string, ProjectsDashboardCacheEntry>();

function getProjectsDashboardCacheKey(userId: string, accountId: string) {
  return `${userId}:${accountId}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(dateStr: string) {
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - startOfToday().getTime()) / 86_400_000);
}

function memberName(m: MemberUser) {
  const n = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
  return n || m.email.split("@")[0] || "User";
}

function memberInitials(m: MemberUser) {
  const a = m.first_name?.[0] ?? "";
  const b = m.last_name?.[0] ?? "";
  if (a || b) return `${a}${b}`.toUpperCase();
  return (m.email?.[0] ?? "U").toUpperCase();
}

const PANEL_GLASS_CLASS =
  "border border-neutral-200/70 bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

function SectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-[28px] p-5 md:p-6",
        PANEL_GLASS_CLASS,
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-neutral-900 md:text-lg">
          {title}
        </h2>
        {action}
      </div>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

function SeeAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-700"
    >
      See All <ChevronRight className="h-3 w-3" />
    </Link>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div
        className={cn(
          "h-20 animate-pulse rounded-[24px] bg-white/50",
          PANEL_GLASS_CLASS
        )}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div
          className={cn(
            "h-64 animate-pulse rounded-[28px] bg-white/50 lg:col-span-3",
            PANEL_GLASS_CLASS
          )}
        />
        <div
          className={cn(
            "h-64 animate-pulse rounded-[28px] bg-white/50 lg:col-span-2",
            PANEL_GLASS_CLASS
          )}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-56 animate-pulse rounded-[28px] bg-white/50",
              PANEL_GLASS_CLASS
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Pie legend ring ───────────────────────────────────────────────────────────

function StatusRings({
  done,
  active,
  backlog,
  total,
}: {
  done: number;
  active: number;
  backlog: number;
  total: number;
}) {
  const donePct = total ? Math.round((done / total) * 100) : 0;
  const activePct = total ? Math.round((active / total) * 100) : 0;
  const backlogPct = total ? Math.round((backlog / total) * 100) : 0;

  const track = [{ name: "Track", value: 1 }];
  const outer = [
    { name: "Done", value: Math.max(done, 0.01), color: "var(--kenoo-yellow)" },
    { name: "Rest", value: Math.max(total - done, 0.01), color: "transparent" },
  ];
  const mid = [
    { name: "Active", value: Math.max(active, 0.01), color: "var(--kenoo-orange)" },
    { name: "Rest", value: Math.max(total - active, 0.01), color: "transparent" },
  ];
  const inner = [
    { name: "Backlog", value: Math.max(backlog, 0.01), color: "var(--kenoo-sky)" },
    { name: "Rest", value: Math.max(total - backlog, 0.01), color: "transparent" },
  ];

  return (
    <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-6 sm:flex-row sm:justify-between sm:gap-4">
      <div className="space-y-4 text-base">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-kenoo-yellow" />
          <span className="font-light text-neutral-500">Done</span>
          <span className="font-semibold tabular-nums text-neutral-900">{donePct}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-kenoo-orange" />
          <span className="font-light text-neutral-500">In Progress</span>
          <span className="font-semibold tabular-nums text-neutral-900">{activePct}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-kenoo-sky" />
          <span className="font-light text-neutral-500">Backlog</span>
          <span className="font-semibold tabular-nums text-neutral-900">{backlogPct}%</span>
        </div>
      </div>
      <div className="relative h-[210px] w-[210px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={track}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={96}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              fill="#EEF1F6"
              isAnimationActive={false}
            />
            <Pie
              data={outer}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={96}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              cornerRadius={8}
            >
              {outer.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Pie>
            <Pie
              data={track}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={72}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              fill="#EEF1F6"
              isAnimationActive={false}
            />
            <Pie
              data={mid}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={72}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              cornerRadius={6}
            >
              {mid.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Pie>
            <Pie
              data={track}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              fill="#EEF1F6"
              isAnimationActive={false}
            />
            <Pie
              data={inner}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              cornerRadius={6}
            >
              {inner.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

interface AgentsProjectsProps {
  analyticsData: unknown;
}

function AgentsProjectsContent({ analyticsData: _analyticsData }: AgentsProjectsProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { activeAccount, activeAccountId, loading: accountLoading } = useActiveAccount();
  const initialCachedData =
    user && activeAccountId
      ? projectsDashboardCache.get(
          getProjectsDashboardCacheKey(user.id, activeAccountId)
        )
      : undefined;
  const [projects, setProjects] = useState<ProjectWithHub[]>(
    () => initialCachedData?.projects ?? []
  );
  const [tasks, setTasks] = useState<HubTask[]>(
    () => initialCachedData?.tasks ?? []
  );
  const [loading, setLoading] = useState(() => !initialCachedData);
  const loadedCacheKeyRef = useRef<string | null>(
    user && activeAccountId
      ? getProjectsDashboardCacheKey(user.id, activeAccountId)
      : null
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const refresh = useCallback(() => {
    if (user && activeAccountId) {
      projectsDashboardCache.delete(
        getProjectsDashboardCacheKey(user.id, activeAccountId)
      );
    }
    setRefreshTrigger((r) => r + 1);
  }, [user, activeAccountId]);

  const loadProjects = useCallback(async () => {
    if (authLoading || accountLoading) return;
    if (!user || !activeAccountId) {
      loadedCacheKeyRef.current = null;
      setProjects([]);
      setTasks([]);
      setLoading(false);
      return;
    }
    const cacheKey = getProjectsDashboardCacheKey(user.id, activeAccountId);
    const cached = projectsDashboardCache.get(cacheKey);
    if (cached) {
      loadedCacheKeyRef.current = cacheKey;
      setProjects(cached.projects);
      setTasks(cached.tasks);
      setLoading(false);
      return;
    }
    loadedCacheKeyRef.current = null;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const rows = (
        await loadAccessibleProjects(user.id, { accountId: activeAccountId })
      ).sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      if (rows.length === 0) {
        setProjects([]);
        setTasks([]);
        return;
      }

      const projectIds = rows.map((p) => p.id);
      const [{ data: taskRows }, { data: memberRows }] = await Promise.all([
        supabase
          .from("project_tasks")
          .select(
            "id, project_id, title, status, due_date, assigned_by, is_private, priority, updated_at, completed_at, task_assignees:project_task_assignees(user_id)"
          )
          .in("project_id", projectIds),
        supabase
          .from("project_members")
          .select("project_id, user_id")
          .in("project_id", projectIds),
      ]);

      const visibleTasks = (taskRows ?? []).map((row) => {
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
          ...(rest as Omit<HubTask, "assignee_ids">),
          assignee_ids,
        } as HubTask;
      }).filter((t) => isTaskVisibleToUser(t, user.id));

      const countMap = new Map<string, { total: number; done: number }>();
      for (const t of visibleTasks) {
        if (!countMap.has(t.project_id)) countMap.set(t.project_id, { total: 0, done: 0 });
        const entry = countMap.get(t.project_id)!;
        entry.total += 1;
        if (t.status === "completed") entry.done += 1;
      }

      const membersByProject = new Map<string, string[]>();
      const allUserIds = new Set<string>();
      for (const row of memberRows ?? []) {
        if (!membersByProject.has(row.project_id)) membersByProject.set(row.project_id, []);
        membersByProject.get(row.project_id)!.push(row.user_id);
        allUserIds.add(row.user_id);
      }
      for (const task of visibleTasks) {
        for (const assigneeId of task.assignee_ids ?? []) {
          allUserIds.add(assigneeId);
        }
      }

      const userMap = new Map<string, MemberUser>();
      if (allUserIds.size > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, first_name, last_name, email, avatar_url")
          .in("id", Array.from(allUserIds));
        for (const u of usersData ?? []) userMap.set(u.id, u as MemberUser);
      }

      const hydratedTasks = visibleTasks.map((task) => ({
        ...task,
        assignee_users: (task.assignee_ids ?? [])
          .map((id) => userMap.get(id))
          .filter((u): u is MemberUser => !!u),
      }));

      const loadedProjects = rows.map((p) => ({
          ...p,
          task_count: countMap.get(p.id)?.total ?? 0,
          done_count: countMap.get(p.id)?.done ?? 0,
          members: (membersByProject.get(p.id) ?? [])
            .map((id) => userMap.get(id))
            .filter((u): u is MemberUser => !!u),
        }));
      projectsDashboardCache.set(cacheKey, {
        projects: loadedProjects,
        tasks: hydratedTasks,
      });
      loadedCacheKeyRef.current = cacheKey;
      setTasks(hydratedTasks);
      setProjects(loadedProjects);
    } catch {
      setProjects([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, accountLoading, activeAccountId, refreshTrigger]);

  useEffect(() => {
    if (authLoading || accountLoading) return;
    loadProjects();
  }, [loadProjects, authLoading, accountLoading]);

  useEffect(() => {
    if (!user || !activeAccountId) return;
    const cacheKey = getProjectsDashboardCacheKey(user.id, activeAccountId);
    if (loadedCacheKeyRef.current !== cacheKey) return;
    projectsDashboardCache.set(
      cacheKey,
      { projects, tasks }
    );
  }, [user, activeAccountId, projects, tasks]);

  const showLoading = authLoading || accountLoading || loading;

  const projectById = useMemo(() => {
    const map = new Map<string, ProjectWithHub>();
    for (const p of projects) map.set(p.id, p);
    return map;
  }, [projects]);

  const allMembers = useMemo(() => {
    const map = new Map<string, MemberUser>();
    for (const p of projects) {
      for (const m of p.members) map.set(m.id, m);
    }
    return Array.from(map.values());
  }, [projects]);

  const total = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "in_review"
  ).length;
  const backlogTasks = tasks.filter(
    (t) => t.status === "todo" || t.status === "on_hold" || t.status === "blocked"
  ).length;

  const openTasks = tasks.filter((t) => t.status !== "completed");

  const todayTasks = useMemo(() => {
    const dueTodayOrOverdue = openTasks
      .filter((t) => t.due_date && daysFromToday(t.due_date) <= 0)
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    const mine = openTasks
      .filter((t) => {
        if (!user?.id) return false;
        return (
          t.assignee_ids ?? []
        ).includes(user.id);
      })
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return (a.priority ?? 99) - (b.priority ?? 99);
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    const dueSoon = openTasks
      .filter((t) => {
        if (!t.due_date) return false;
        const d = daysFromToday(t.due_date);
        return d > 0 && d <= 7;
      })
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

    const seen = new Set<string>();
    const feed: HubTask[] = [];
    for (const t of [...dueTodayOrOverdue, ...mine, ...dueSoon, ...openTasks]) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      feed.push(t);
      if (feed.length >= 3) break;
    }
    return feed;
  }, [openTasks, user?.id]);

  const attentionFeed = useMemo(() => {
    const overdue = openTasks
      .filter((t) => t.due_date && daysFromToday(t.due_date) < 0)
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    const mine = openTasks.filter((t) => {
      if (!user?.id) return false;
      return (
        t.assignee_ids ?? []
      ).includes(user.id);
    });
    const seen = new Set<string>();
    const feed: HubTask[] = [];
    for (const t of [...overdue, ...mine, ...openTasks]) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      feed.push(t);
      if (feed.length >= 3) break;
    }
    return feed;
  }, [openTasks, user?.id]);

  const teamWorkload = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) {
      if (t.status === "completed") continue;
      const ids = t.assignee_ids ?? [];
      for (const id of ids) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([id, openTasks]) => {
        const member = allMembers.find((m) => m.id === id);
        return member ? { member, openTasks } : null;
      })
      .filter((r): r is { member: MemberUser; openTasks: number } => !!r)
      .sort((a, b) => b.openTasks - a.openTasks)
      .slice(0, 3);
  }, [tasks, allMembers]);

  const trackerData = useMemo(() => {
    const days: { label: string; done: number; open: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      let done = 0;
      let open = 0;
      for (const t of tasks) {
        if (t.completed_at) {
          const c = new Date(t.completed_at);
          if (c >= d && c < next) done += 1;
        } else if (t.updated_at) {
          const u = new Date(t.updated_at);
          if (u >= d && u < next) open += 1;
        }
      }
      days.push({ label, done, open });
    }
    return days;
  }, [tasks]);

  const accountShortId = activeAccountId
    ? activeAccountId.replace(/-/g, "").slice(0, 10).toUpperCase()
    : "—";

  const copyAccountId = async () => {
    if (!activeAccountId) return;
    try {
      await navigator.clipboard.writeText(activeAccountId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const openBoard = (projectId?: string) => {
    router.push(
      projectId ? `/tasks?project=${projectId}` : "/tasks"
    );
  };

  return (
    <>
      <div className="flex h-full overflow-hidden">
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-kenoo-white">
            {/* Padding lives on the scroller so card shadows aren't clipped at the sidebar edge */}
            <div className="app-sidebar-pad min-h-0 flex-1 overflow-y-auto overscroll-none pb-10 pt-4 pr-8 md:pr-6">
              {showLoading ? (
                <DashboardSkeleton />
              ) : total === 0 ? (
                <div
                  className={cn(
                    "flex min-h-[420px] flex-col items-center justify-center rounded-[28px] px-4 text-center",
                    PANEL_GLASS_CLASS
                  )}
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                    <FolderOpen className="h-8 w-8 text-neutral-400" />
                  </div>
                  <p className="font-medium text-neutral-700">No projects yet</p>
                  <p className="mt-1 max-w-sm text-sm font-light text-neutral-400">
                    Spin up your first project to unlock this hub.
                  </p>
                  <NewProjectChromeButton
                    className="mt-5"
                    onClick={() => {
                      setEditProject(null);
                      setFormOpen(true);
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* ── Workspace hero ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col gap-4 rounded-[28px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6",
                      PANEL_GLASS_CLASS
                    )}
                  >
                    <div className="min-w-0">
                      <h1 className="truncate text-xl font-semibold tracking-tight text-neutral-900 md:text-2xl">
                        {activeAccount?.name ?? "Workspace"} Hub
                      </h1>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-light text-neutral-500">
                        <span>
                          {activeAccount?.accountType === "organization"
                            ? "Organization workspace"
                            : "Personal workspace"}
                        </span>
                        <span className="text-neutral-300">|</span>
                        <button
                          type="button"
                          onClick={copyAccountId}
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-neutral-400 transition-colors hover:text-neutral-700"
                          title="Copy account ID"
                        >
                          ID {accountShortId}
                          {copiedId ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-3">
                      <div className="flex items-center -space-x-2">
                        {allMembers.slice(0, 5).map((m) => (
                          <Avatar
                            key={m.id}
                            className="h-9 w-9 border-2 border-kenoo-white shadow-sm"
                            title={memberName(m)}
                          >
                            {m.avatar_url ? <AvatarImage src={m.avatar_url} alt="" /> : null}
                            <AvatarFallback className="bg-neutral-100 text-[10px] font-medium text-neutral-600">
                              {memberInitials(m)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {allMembers.length > 5 && (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-kenoo-white bg-[#1F1B2E] text-[10px] font-semibold text-white shadow-sm">
                            +{allMembers.length - 5}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setTaskFormOpen(true)}
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-kenoo-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                      >
                        <Plus className="h-4 w-4" /> New Task
                      </button>
                      <NewProjectChromeButton
                        onClick={() => {
                          setEditProject(null);
                          setFormOpen(true);
                        }}
                      />
                    </div>
                  </motion.div>

                  {/* ── Today's tasks + Status rings ── */}
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                    <SectionCard
                      title="Today's tasks"
                      action={<SeeAllLink href="/tasks" />}
                      className="lg:col-span-3"
                    >
                      {todayTasks.length === 0 ? (
                        <div className="flex min-h-[180px] items-center justify-center text-sm font-light text-neutral-400">
                          Nothing due today.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {todayTasks.map((task, i) => {
                            const project = projectById.get(task.project_id);
                            const status = TASK_STATUS_CONFIG[task.status];
                            const members = (task.assignee_users ?? []).slice(0, 3);
                            return (
                              <motion.button
                                key={task.id}
                                type="button"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => openBoard(task.project_id)}
                                className={cn(
                                  "flex min-h-[200px] flex-col rounded-[22px] p-4 text-left",
                                  PANEL_GLASS_CLASS,
                                  "bg-kenoo-white transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                                )}
                                style={{
                                  border: "none",
                                  backgroundImage:
                                    `radial-gradient(circle at 8% 8%, color-mix(in srgb, ${project?.color ?? "var(--kenoo-sky)"} 8%, transparent), transparent 42%), radial-gradient(circle at 92% 92%, color-mix(in srgb, ${status?.accent ?? "var(--kenoo-sky)"} 5%, transparent), transparent 42%)`,
                                }}
                              >
                                <h3 className="line-clamp-3 text-base font-normal leading-snug text-neutral-900">
                                  {task.title}
                                </h3>
                                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-light text-neutral-600/80">
                                  <span
                                    aria-hidden="true"
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: project?.color ?? "var(--kenoo-sky)" }}
                                  />
                                  <span className="truncate">{project?.name ?? "Project"}</span>
                                </p>
                                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                                  <div className="flex items-center -space-x-1.5">
                                    {members.map((m) => (
                                      <Avatar
                                        key={m.id}
                                        className="h-7 w-7 border-2 border-white/70"
                                      >
                                        {m.avatar_url ? (
                                          <AvatarImage src={m.avatar_url} alt="" />
                                        ) : null}
                                        <AvatarFallback className="bg-white/70 text-[9px] text-neutral-600">
                                          {memberInitials(m)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                  <span
                                    className="text-right text-[10px] font-medium"
                                    style={{ color: status?.accent ?? "rgb(115 115 115)" }}
                                  >
                                    {status?.label ?? task.status}
                                  </span>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </SectionCard>

                    <SectionCard
                      title="Task Status"
                      action={
                        <span className="text-xs font-light text-neutral-400">
                          Total {totalTasks}
                        </span>
                      }
                      className="lg:col-span-2"
                      bodyClassName="flex"
                    >
                      <StatusRings
                        done={completedTasks}
                        active={inProgressTasks}
                        backlog={backlogTasks}
                        total={Math.max(totalTasks, 1)}
                      />
                    </SectionCard>
                  </div>

                  {/* ── Workload + Tracker + Attention ── */}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <SectionCard
                      title="Team Workload"
                      action={<SeeAllLink href="/projects" />}
                    >
                      {teamWorkload.length === 0 ? (
                        <p className="py-10 text-center text-sm font-light text-neutral-400">
                          No open tasks are assigned right now.
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {teamWorkload.map(({ member, openTasks }) => (
                            <li
                              key={member.id}
                              className="flex items-center gap-3 rounded-2xl px-1 py-1.5"
                            >
                              <Avatar className="h-11 w-11 flex-shrink-0">
                                {member.avatar_url ? (
                                  <AvatarImage src={member.avatar_url} alt="" />
                                ) : null}
                                <AvatarFallback className="bg-neutral-100 text-xs font-medium text-neutral-600">
                                  {memberInitials(member)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-neutral-900">
                                  {memberName(member)}
                                </p>
                                <p className="truncate text-xs font-light text-neutral-400">
                                  Current workload
                                </p>
                              </div>
                              <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-neutral-800">
                                {openTasks}{" "}
                                <span className="font-light text-neutral-400">
                                  {openTasks === 1 ? "open task" : "open tasks"}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </SectionCard>

                    <SectionCard
                      title="Tracker Detail"
                      action={<SeeAllLink href="/timeline" />}
                    >
                      <div className="mb-3 flex items-center gap-4 text-[11px] font-medium text-neutral-500">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-sm bg-kenoo-yellow" /> Done
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-sm bg-kenoo-sky" /> Active
                        </span>
                      </div>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={trackerData}
                            margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                            barGap={4}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#E8EEF5"
                            />
                            <XAxis
                              dataKey="label"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#9CA3AF", fontSize: 11 }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                              tick={{ fill: "#9CA3AF", fontSize: 11 }}
                            />
                            <Tooltip
                              cursor={{ fill: "rgba(0,0,0,0.03)" }}
                              contentStyle={{
                                borderRadius: 12,
                                border: "none",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                              }}
                            />
                            <Bar
                              dataKey="done"
                              name="Done"
                              fill="var(--kenoo-yellow)"
                              radius={[8, 8, 8, 8]}
                              maxBarSize={18}
                            />
                            <Bar
                              dataKey="open"
                              name="Active"
                              fill="var(--kenoo-sky)"
                              radius={[8, 8, 8, 8]}
                              maxBarSize={18}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Needs Attention"
                      action={<SeeAllLink href="/tasks" />}
                      className="md:col-span-2 xl:col-span-1"
                    >
                      {attentionFeed.length === 0 ? (
                        <p className="py-10 text-center text-sm font-light text-neutral-400">
                          You&apos;re all clear.
                        </p>
                      ) : (
                        <ul className="space-y-2.5">
                          {attentionFeed.map((task, i) => {
                            const project = projectById.get(task.project_id);
                            const assigneeIds =
                              task.assignee_ids ??
                              [];
                            const assignee =
                              allMembers.find((m) => m.id === assigneeIds[0]) ??
                              project?.members[0];
                            const highlight = i === 0;
                            const status = TASK_STATUS_CONFIG[task.status];
                            return (
                              <li key={task.id}>
                                <button
                                  type="button"
                                  onClick={() => openBoard(task.project_id)}
                                  className={cn(
                                    "flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition-all",
                                    highlight
                                      ? "border border-white/80 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
                                      : "hover:bg-white/40"
                                  )}
                                >
                                  <Avatar className="h-10 w-10 flex-shrink-0">
                                    {assignee?.avatar_url ? (
                                      <AvatarImage src={assignee.avatar_url} alt="" />
                                    ) : null}
                                    <AvatarFallback className="bg-neutral-100 text-[10px] font-medium text-neutral-600">
                                      {assignee ? memberInitials(assignee) : "T"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-neutral-900">
                                      {assignee ? memberName(assignee) : project?.name}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-xs font-light leading-relaxed text-neutral-500">
                                      {task.title}
                                    </p>
                                    <div className="mt-1.5 flex items-center justify-between gap-2">
                                      <span className="truncate text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                                        {status?.label}
                                      </span>
                                      {task.due_date && (
                                        <span className="flex-shrink-0 text-[10px] font-light text-neutral-400">
                                          {new Date(task.due_date).toLocaleDateString("en-US", {
                                            day: "numeric",
                                            month: "short",
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </SectionCard>
                  </div>
                </div>
              )}
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

export default function AgentsProjects(props: AgentsProjectsProps) {
  return <AgentsProjectsContent {...props} />;
}
