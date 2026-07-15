"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronDown, Plus, Minus, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Youtube } from "lucide-react";
import { FaTiktok, FaInstagram, FaFacebook } from "react-icons/fa";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

function escapeIlike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export interface SocialAccountOption {
  id: string;
  username: string | null;
  full_name: string | null;
  platform: string;
  profile_pic_url: string | null;
  profile_id: string;
  profile_name: string;
  profile_avatar_url?: string | null;
}

interface ProfileGroup {
  profileId: string;
  profileName: string;
  profileAvatarUrl: string | null;
  accounts: SocialAccountOption[];
}

interface SocialAccountSearchProps {
  /** Already-selected account ids (e.g. current strategy targets) – shown as selected or disabled. */
  selectedIds?: string[];
  /** Called when user selects an account to add/tag. */
  onSelect: (account: SocialAccountOption) => void;
  className?: string;
  placeholder?: string;
  /** Optional: restrict to a single profile id (only show that profile's accounts). */
  profileIdFilter?: string | null;
}

const platformIcons: Record<string, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4 text-red-500" />,
  tiktok: <FaTiktok className="h-3.5 w-3.5" />,
  instagram: <FaInstagram className="h-4 w-4 text-pink-500" />,
  facebook: <FaFacebook className="h-4 w-4 text-blue-600" />,
};

function getPlatformIcon(platform: string) {
  return platformIcons[platform?.toLowerCase()] ?? null;
}

export function SocialAccountSearch({
  selectedIds = [],
  onSelect,
  className,
  placeholder = "Add target account...",
  profileIdFilter = null,
}: SocialAccountSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<SocialAccountOption[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("");
  const [expandedProfiles, setExpandedProfiles] = React.useState<Record<string, boolean>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Debounce search input (same pattern as ledger transactions)
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm((prev) => {
        const next = searchTerm.trim();
        return next !== prev ? next : prev;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  const fetchPage = React.useCallback(
    async (pageNum: number, append: boolean) => {
      const supabase = getSupabaseClient();
      const q = debouncedSearchTerm.trim().toLowerCase();
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("social_accounts")
        .select(
          "id, username, full_name, platform, profile_pic_url, profile_id, profiles(id, name, avatar_url, people!people_profile_id_fkey(first_name, last_name))",
          { count: "exact" }
        )
        .order("username", { ascending: true, nullsFirst: false });

      if (profileIdFilter) {
        query = query.eq("profile_id", profileIdFilter);
      }

      if (q) {
        const pattern = `%${escapeIlike(q)}%`;
        query = query.or(
          `username.ilike.${pattern},full_name.ilike.${pattern},platform.ilike.${pattern}`
        );
      }

      const { data, error, count } = await query.range(from, to);

      if (error) {
        console.error("Error fetching social accounts:", error);
        if (!append) setResults([]);
        setTotalCount(0);
        return;
      }

      type Row = {
        id: string;
        username: string | null;
        full_name: string | null;
        platform: string;
        profile_pic_url: string | null;
        profile_id: string;
        profiles:
          | {
              id: string;
              name: string | null;
              avatar_url: string | null;
              people:
                | { first_name: string | null; last_name: string | null }
                | { first_name: string | null; last_name: string | null }[]
                | null;
            }
          | {
              id: string;
              name: string | null;
              avatar_url: string | null;
              people:
                | { first_name: string | null; last_name: string | null }
                | { first_name: string | null; last_name: string | null }[]
                | null;
            }[]
          | null;
      };
      const rows = (data || []) as unknown as Row[];

      const options: SocialAccountOption[] = rows.map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const person = profile?.people
          ? Array.isArray(profile.people)
            ? profile.people[0]
            : profile.people
          : null;
        const profileName =
          profile?.name?.trim() ||
          [person?.first_name, person?.last_name].filter(Boolean).join(" ") ||
          "Unknown profile";
        return {
          id: row.id,
          username: row.username,
          full_name: row.full_name,
          platform: row.platform,
          profile_pic_url: row.profile_pic_url,
          profile_id: row.profile_id,
          profile_name: profileName,
          profile_avatar_url: profile?.avatar_url ?? null,
        };
      });

      if (append) {
        setResults((prev) => [...prev, ...options]);
      } else {
        setResults(options);
      }
      setTotalCount(count ?? 0);
    },
    [debouncedSearchTerm, profileIdFilter]
  );

  // Fetch when dropdown is open and page or debounced search changes
  React.useEffect(() => {
    if (!open) return;
    const append = page > 1;
    if (append) {
      setLoadingMore(true);
      fetchPage(page, true).finally(() => setLoadingMore(false));
    } else {
      setResults([]);
      setLoading(true);
      fetchPage(1, false).finally(() => setLoading(false));
    }
  }, [open, page, debouncedSearchTerm, fetchPage]);

  // Group current results by profile for display
  const groups = React.useMemo(() => {
    const byProfile = new Map<string, ProfileGroup>();
    for (const account of results) {
      const g = byProfile.get(account.profile_id);
      if (g) {
        g.accounts.push(account);
      } else {
        byProfile.set(account.profile_id, {
          profileId: account.profile_id,
          profileName: account.profile_name,
          profileAvatarUrl: account.profile_avatar_url ?? null,
          accounts: [account],
        });
      }
    }
    return Array.from(byProfile.values()).sort((a, b) =>
      a.profileName.localeCompare(b.profileName)
    );
  }, [results]);

  const hasMore = results.length < totalCount;
  const showLoadMore = open && hasMore && !loading && results.length > 0;

  // Expand first profile by default when results change
  React.useEffect(() => {
    if (groups.length > 0 && groups.length <= 5) {
      setExpandedProfiles((prev) => {
        const next = { ...prev };
        groups.forEach((g) => {
          if (next[g.profileId] === undefined) next[g.profileId] = true;
        });
        return next;
      });
    }
  }, [groups]);

  const toggleProfile = (profileId: string) => {
    setExpandedProfiles((prev) => ({ ...prev, [profileId]: !prev[profileId] }));
  };

  const handleSelect = (account: SocialAccountOption) => {
    onSelect(account);
    setOpen(false);
  };

  return (
    <div className="w-full">
      <Select
        value=""
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setSearchTerm("");
          } else {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
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
            <span className="font-normal truncate">{placeholder}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={8}
          className="p-0 bg-white/80 backdrop-blur-xl shadow-2xl !z-[9999] w-[350px] min-w-[350px] max-h-[500px] overflow-hidden flex flex-col [&>div]:!p-0 rounded-lg"
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
                placeholder="Search by profile or account..."
                className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent flex-1 w-full text-sm focus:outline-none placeholder:text-neutral-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div
            ref={scrollRef}
            className="overflow-y-auto flex-1 min-h-0 bg-neutral-300/20 backdrop-blur-xl"
            onWheel={(e) => e.stopPropagation()}
          >
            {loading ? (
              <div className="py-8 px-4 flex flex-col items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Searching...
              </div>
            ) : groups.length === 0 ? (
              <div className="py-4 px-4 text-sm text-neutral-500">
                {debouncedSearchTerm.trim() ? "No accounts match your search." : "Type to search accounts."}
              </div>
            ) : (
              <>
                <div className="py-1 px-2 text-[10px] uppercase tracking-wider text-neutral-400">
                  Showing {results.length} of {totalCount}
                </div>
                {groups.map((group) => (
                <div key={group.profileId}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleProfile(group.profileId);
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center w-full px-4 py-2 border-b border-gray-900/10 cursor-pointer bg-neutral-200/50 hover:bg-neutral-300/40 transition-colors gap-3"
                  >
                    <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center">
                      {group.profileAvatarUrl ? (
                        <Image
                          src={group.profileAvatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full object-cover aspect-square w-8 h-8"
                        />
                      ) : (
                        <span className="text-xs text-neutral-500 font-medium">
                          {group.profileName.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-normal text-gray-700">
                      {group.profileName}
                    </span>
                    <div className="flex-1" />
                    {expandedProfiles[group.profileId] ? (
                      <Minus className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Plus className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedProfiles[group.profileId] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        {group.accounts.map((account) => {
                          const isSelected = selectedIds.includes(account.id);
                          return (
                            <div
                              key={account.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isSelected) handleSelect(account);
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className={cn(
                                "flex items-center px-4 py-2 cursor-pointer rounded-none hover:bg-neutral-300/30 focus:bg-neutral-500/10",
                                isSelected && "bg-neutral-200/60 cursor-default"
                              )}
                            >
                              <div className="flex items-center space-x-3 w-full min-w-0">
                                <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-neutral-200">
                                  {account.profile_pic_url ? (
                                    <Image
                                      src={account.profile_pic_url}
                                      alt=""
                                      width={32}
                                      height={32}
                                      className="rounded-full object-cover w-full h-full"
                                    />
                                  ) : (
                                    <span className="flex items-center justify-center w-full h-full text-xs text-neutral-500">
                                      {getPlatformIcon(account.platform)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-normal text-sm block truncate">
                                      {account.username || account.full_name || account.id}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      {getPlatformIcon(account.platform)}
                                      <span className="capitalize">{account.platform}</span>
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 text-black ml-auto flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
                {showLoadMore && (
                  <div className="p-2 border-t border-gray-900/10 bg-neutral-200/50">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPage((p) => p + 1);
                      }}
                      disabled={loadingMore}
                      className="w-full py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-300/40 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {loadingMore ? "Loading..." : `Load more (${results.length} of ${totalCount})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
