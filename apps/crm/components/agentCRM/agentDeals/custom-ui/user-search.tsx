"use client";

import * as React from "react";
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";
import Image from "next/image";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { getSupabaseClient } from "@/app/auth/supabaseClient";

const FALLBACK_LOGO = FALLBACK_ICON_URL;

export interface UserResult {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

interface UserSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  triggerIcon?: "chevron" | "plus";
  onSelectUser?: (user: UserResult) => void;
}

export function UserSearch({ value, onChange, className, placeholder, triggerIcon = "chevron", onSelectUser }: UserSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [users, setUsers] = React.useState<UserResult[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("users")
          .select("id, first_name, last_name, email, avatar_url")
          .order("first_name", { ascending: true });

        if (error) {
          console.error("Error fetching users:", error);
          setUsers([]);
          return;
        }

        const list = (data || [])
          .map((row: { id: string; first_name: string | null; last_name: string | null; email: string; avatar_url: string | null }) => ({
            id: row.id,
            firstName: row.first_name || "",
            lastName: row.last_name || "",
            fullName: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
            email: row.email || "",
            avatarUrl: row.avatar_url ?? null,
          }))
          .filter((u) => u.firstName || u.lastName || u.email);

        setUsers(list);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
      }
    };

    fetchUsers();
  }, []);

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  const handleSelect = (user: UserResult) => {
    onChange?.(user.fullName);
    onSelectUser?.(user);
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
      >
        <SelectTrigger
          className={cn(
            "relative group hover:bg-transparent p-0 h-auto w-[350px] max-w-full flex items-center justify-between border-0 shadow-none bg-transparent focus:ring-0 focus:ring-offset-0 [&>:last-child]:hidden",
            className
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-normal truncate">{value || placeholder || "Select user..."}</span>
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
          {/* Search */}
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
                placeholder="Search users..."
                className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent flex-1 w-full text-sm focus:outline-none placeholder:text-neutral-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* List */}
          <div
            className="overflow-y-auto flex-1 min-h-0 bg-neutral-300/20 backdrop-blur-xl"
            onWheel={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <div className="py-4 px-4 text-sm text-gray-500">No users found.</div>
            ) : (
              filtered.map((user) => (
                <div
                  key={user.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(user);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-neutral-300/30 border-b border-gray-900/5 last:border-0"
                >
                  <Image
                    src={user.avatarUrl || FALLBACK_LOGO}
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
                    <div className="text-sm font-normal truncate">{user.fullName || user.email}</div>
                    {user.email && (
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
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
