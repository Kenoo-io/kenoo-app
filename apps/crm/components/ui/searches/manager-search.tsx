"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import * as React from "react";
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";
import { ChevronDown, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { cn } from "@/lib/utils";

const FALLBACK_LOGO = FALLBACK_ICON_URL;

export interface ManagerRecord {
  id: string;
  first_name: string;
  last_name: string;
  displayName: string;
  photoURL: string;
  email: string;
}

export async function loadTeamManagers(): Promise<ManagerRecord[]> {
  const supabase = getSupabaseClient();

  const { data: teamData, error: teamError } = await supabase
    .from("team")
    .select("id, user_id");

  if (teamError) {
    throw teamError;
  }

  if (!teamData?.length) {
    return [];
  }

  const userIds = teamData.map((t) => t.user_id).filter(Boolean) as string[];
  if (userIds.length === 0) {
    return [];
  }

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, avatar_url, email")
    .in("id", userIds);

  if (usersError) {
    throw usersError;
  }

  const managersData: ManagerRecord[] = (usersData || []).map((user) => {
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const displayName = `${firstName} ${lastName}`.trim() || user.email || "Unknown";

    return {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      displayName,
      photoURL: user.avatar_url || "",
      email: user.email || "",
    };
  });

  managersData.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return managersData;
}

interface ManagerSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelectManager?: (manager: ManagerRecord) => void;
  className?: string;
}

export function ManagerSearch({ value, onValueChange, onSelectManager, className }: ManagerSearchProps) {
  const [managers, setManagers] = React.useState<ManagerRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const run = async () => {
      try {
        setManagers(await loadTeamManagers());
      } catch (error) {
        console.error("Error fetching managers:", error);
        wallsToast.error("Error", "Failed to load managers");
        setManagers([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const selectedManager = managers.find((m) => m.id === value);

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        onValueChange(nextValue);
        const selected = managers.find((manager) => manager.id === nextValue);
        if (selected) onSelectManager?.(selected);
      }}
      disabled={loading}
    >
      <SelectTrigger className={className}>
        {selectedManager ? (
          <div className="flex items-center space-x-2 flex-1">
            {selectedManager.photoURL ? (
              <div className="relative w-5 h-5 overflow-hidden rounded-full flex-shrink-0 flex items-center justify-center">
                <Image
                  src={selectedManager.photoURL}
                  alt={selectedManager.displayName}
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                <span className="text-xs text-gray-600">{selectedManager.displayName.charAt(0)}</span>
              </div>
            )}
            <span className="flex-1 text-left">{selectedManager.displayName}</span>
          </div>
        ) : (
          <SelectValue placeholder={loading ? "Loading managers..." : "Select a manager"} />
        )}
      </SelectTrigger>
      <SelectContent>
        {managers.length === 0 && !loading ? (
          <div className="py-2 px-4 text-sm text-gray-500">No managers found</div>
        ) : (
          managers.map((manager) => (
            <SelectItem
              key={manager.id}
              value={manager.id}
            >
              <div className="flex items-center space-x-2">
                {manager.photoURL ? (
                  <div className="relative w-5 h-5 overflow-hidden rounded-full flex-shrink-0 flex items-center justify-center">
                    <Image
                      src={manager.photoURL}
                      alt={manager.displayName}
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs text-gray-600">{manager.displayName.charAt(0)}</span>
                  </div>
                )}
                <span>{manager.displayName}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

/** Searchable popover to pick a team manager (Supabase `team` + `users`), same pool as {@link ManagerSearch}. */
export function ManagerSearchAdd({
  className,
  placeholder = "Add manager",
  triggerIcon = "plus",
  onSelectManager,
}: {
  className?: string;
  placeholder?: string;
  triggerIcon?: "chevron" | "plus";
  onSelectManager: (manager: ManagerRecord) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [managers, setManagers] = React.useState<ManagerRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const run = async () => {
      try {
        setManagers(await loadTeamManagers());
      } catch (error) {
        console.error("Error fetching managers:", error);
        wallsToast.error("Error", "Failed to load managers");
        setManagers([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return managers;
    const q = searchTerm.toLowerCase();
    return managers.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [managers, searchTerm]);

  const handleSelect = (m: ManagerRecord) => {
    onSelectManager(m);
    setOpen(false);
  };

  return (
    <div className="w-full">
      <Select
        value=""
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setSearchTerm("");
          else setTimeout(() => inputRef.current?.focus(), 0);
        }}
        onValueChange={() => {}}
        disabled={loading}
      >
        <SelectTrigger
          className={cn(
            "relative group hover:bg-transparent p-0 h-auto w-[350px] max-w-full flex items-center justify-between border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 [&>:last-child]:hidden",
            className
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 truncate text-sm font-light text-neutral-400">
              {loading ? "Loading managers…" : placeholder}
            </span>
          </div>
          {triggerIcon === "plus" ? (
            <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </SelectTrigger>

        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={8}
          className="p-0 bg-white/80 backdrop-blur-xl shadow-2xl !z-[9999] w-[350px] min-w-[350px] max-h-[400px] overflow-hidden flex flex-col [&>div]:!p-0 rounded-lg"
        >
          <div className="p-2 border-b border-gray-900/10 flex-shrink-0 sticky top-0 bg-white/80 backdrop-blur-xl z-10">
            <div className="rounded-lg bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 pr-4 pl-2 py-2">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchTerm(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") setSearchTerm("");
                }}
                placeholder="Search managers…"
                className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent flex-1 w-full text-sm focus:outline-none placeholder:text-neutral-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div
            className="overflow-y-auto flex-1 min-h-0 bg-neutral-300/20 backdrop-blur-xl"
            onWheel={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <div className="py-4 px-4 text-sm text-gray-500">
                {loading ? "Loading…" : "No managers found."}
              </div>
            ) : (
              filtered.map((manager) => (
                <div
                  key={manager.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(manager);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-neutral-300/30 border-b border-gray-900/5 last:border-0"
                >
                  <Image
                    src={manager.photoURL || FALLBACK_LOGO}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full object-cover aspect-square w-7 h-7 shrink-0"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.src = FALLBACK_LOGO;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-normal truncate">{manager.displayName}</div>
                    {manager.email && (
                      <div className="text-xs text-muted-foreground truncate">{manager.email}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
