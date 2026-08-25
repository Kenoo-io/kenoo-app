"use client";

import { logoutToPortal, resolveAppHref, useAuth } from "@walls/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@walls/ui/dropdown-menu";
import { cn } from "@walls/utils";
import {
  Activity,
  BookOpen,
  ChevronsUpDown,
  CreditCard,
  Gauge,
  Home,
  KeyRound,
  LogOut,
  Menu,
  PanelLeft,
  Search,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { WorkspaceSwitcher } from "@/components/platform/workspace-switcher";
import { useAppSidebar } from "./app-sidebar-context";

const settingsHref = resolveAppHref({
  slug: "settings",
  subdomain: "settings",
  platformBase: "",
});

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/keys", label: "API keys", icon: KeyRound },
  { href: "/usage", label: "Usage", icon: Activity },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/limits", label: "Limits", icon: Gauge },
  { href: "/docs", label: "Docs", icon: BookOpen },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const { isLoading, profile, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } =
    useAppSidebar();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const searchQuery = query.trim();

  const matches = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return [];
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [searchQuery]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCollapsed(false);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        setQuery("");
        setIsMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIsCollapsed, setIsMobileOpen]);

  useEffect(() => {
    setIsMobileOpen(false);
    setQuery("");
  }, [pathname, setIsMobileOpen]);

  useEffect(() => {
    if (!searchQuery) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (searchWrapRef.current?.contains(target)) return;
      setQuery("");
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchQuery]);

  const displayName = profile?.userFullName?.trim() || user?.email || "Kenoo";
  const email = user?.email ?? "";
  const initials =
    profile?.initials?.trim() ||
    displayName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const avatarUrl = profile?.avatarUrl ?? null;

  const railProps = {
    pathname,
    query,
    setQuery,
    searchQuery,
    searchRef,
    searchWrapRef,
    matches,
    router,
    isLoading,
    displayName,
    email,
    initials,
    avatarUrl,
  };

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-40 hidden md:flex">
        <SidebarRail
          collapsed={isCollapsed}
          onCollapse={() => setIsCollapsed(true)}
          onExpand={() => setIsCollapsed(false)}
          {...railProps}
        />
      </div>

      <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-neutral-200 bg-kenoo-white px-3 md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="rounded-lg p-2 text-neutral-600"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium">Kenoo Platform</span>
        <span className="w-9" />
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/20"
            aria-label="Close menu"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <div className="absolute right-2 top-2 z-10 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="rounded-lg p-2 text-neutral-500"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarRail collapsed={false} {...railProps} />
          </div>
        </div>
      ) : null}
    </>
  );
}

type RailProps = {
  collapsed: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  pathname: string;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  searchQuery: string;
  searchRef: RefObject<HTMLInputElement | null>;
  searchWrapRef: RefObject<HTMLDivElement | null>;
  matches: typeof navItems | readonly (typeof navItems)[number][];
  router: ReturnType<typeof useRouter>;
  isLoading: boolean;
  displayName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
};

function SidebarRail({
  collapsed,
  onCollapse,
  onExpand,
  pathname,
  query,
  setQuery,
  searchQuery,
  searchRef,
  searchWrapRef,
  matches,
  router,
  isLoading,
  displayName,
  email,
  initials,
  avatarUrl,
}: RailProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-[#F7F7F8] text-[13px] text-neutral-800",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 px-3 pt-3",
          collapsed && "justify-center px-2",
        )}
      >
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher />
          </div>
        ) : null}
        {!collapsed && onCollapse ? (
          <button
            type="button"
            title="Collapse sidebar"
            onClick={onCollapse}
            className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-kenoo-white hover:text-neutral-700"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : null}
        {collapsed && onExpand ? (
          <button
            type="button"
            title="Expand sidebar"
            onClick={onExpand}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-kenoo-white"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="relative z-20 px-3 pt-3">
        <div ref={searchWrapRef} className="relative">
          {collapsed ? (
            <button
              type="button"
              title="Search"
              onClick={() => {
                onExpand?.();
                setTimeout(() => searchRef.current?.focus(), 50);
              }}
              className="flex h-9 w-full items-center justify-center rounded-lg text-neutral-500 hover:bg-kenoo-white"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : (
            <label className="flex h-9 items-center gap-2 rounded-lg bg-kenoo-white px-2.5 ring-1 ring-black/[0.06]">
              <Search className="h-3.5 w-3.5 text-neutral-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-neutral-400"
              />
              <kbd className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                ⌘K
              </kbd>
            </label>
          )}
          {searchQuery && !collapsed ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg bg-kenoo-white py-1 shadow-lg ring-1 ring-black/[0.08]">
              {matches.length === 0 ? (
                <p className="px-3 py-2 text-neutral-400">No matches</p>
              ) : (
                matches.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50"
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon className="h-3.5 w-3.5 text-neutral-400" />
                    {item.label}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <nav className="mt-3 flex flex-1 flex-col gap-0.5 px-3" aria-label="Platform">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 font-medium transition-colors",
                active
                  ? "bg-black/[0.04] text-neutral-950"
                  : "text-neutral-600 hover:bg-black/[0.025] hover:text-neutral-950",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.6]" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-black/[0.04] p-3">
        {isLoading ? (
          <div className="h-10 rounded-lg bg-kenoo-white/60" />
        ) : (
          <SidebarAccountMenu
            collapsed={collapsed}
            displayName={displayName}
            email={email}
            initials={initials}
            avatarUrl={avatarUrl}
          />
        )}
      </div>
    </aside>
  );
}

function SidebarAccountMenu({
  collapsed,
  displayName,
  email,
  initials,
  avatarUrl,
}: {
  collapsed: boolean;
  displayName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
}) {
  const subtitle = email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={displayName}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left",
            "hover:bg-kenoo-white data-[state=open]:bg-kenoo-white",
            collapsed && "justify-center px-0",
          )}
        >
          <AccountAvatar initials={initials} avatarUrl={avatarUrl} />
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-neutral-900">
                  {displayName}
                </span>
                <span className="block truncate text-[11px] text-neutral-400">
                  {subtitle}
                </span>
              </span>
              <ChevronsUpDown
                className="h-3.5 w-3.5 shrink-0 text-neutral-400"
                strokeWidth={2}
              />
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align={collapsed ? "center" : "start"}
        sideOffset={8}
        className="z-[80] w-[220px] rounded-xl border border-neutral-200 bg-kenoo-white p-1 shadow-lg"
      >
        <div className="px-2.5 py-2">
          <p className="truncate text-[13px] font-medium text-neutral-900">
            {displayName}
          </p>
          {email ? (
            <p className="truncate text-[11px] text-neutral-400">{email}</p>
          ) : null}
        </div>
        <DropdownMenuSeparator className="bg-neutral-100" />
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-2">
          <a href={settingsHref}>
            <Settings className="h-3.5 w-3.5 text-neutral-400" />
            Settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-2">
          <Link href="/billing">
            <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-2">
          <Link href="/docs">
            <BookOpen className="h-3.5 w-3.5 text-neutral-400" />
            Docs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-neutral-100" />
        <DropdownMenuItem
          className="cursor-pointer rounded-lg px-2 py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
          onSelect={() => {
            void logoutToPortal();
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountAvatar({
  initials,
  avatarUrl,
}: {
  initials: string;
  avatarUrl: string | null;
}) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-[11px] font-semibold text-neutral-700">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
