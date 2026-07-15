"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import React, { useState, useEffect } from 'react';
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";
import { useAuth } from "@/app/auth/AuthContext";
import { Card, CardContent } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination";
import Link from 'next/link';
import Image from 'next/image';
import { PitchesSorter } from "@/components/agent-sorters/pitches-sorter";
import { PitchesFilter } from "@/components/agent-filters/pitches-filter";
import CardSkeleton from "@/components/agentCRM/agentCompanies/card-skeleton";
import { getSupabaseClient } from "@/app/auth/supabaseClient";

interface Pitch {
  id: string;
  pitchedTo: string;
  sentBy: string;
  timestamp: string | null;
  creators: string[];
  creatorProfileNames: string[]; // Store profile names for display
  companyWebsite: string;
  companyLogoUrl?: string;
}

const ITEMS_PER_PAGE = 50;

// Cache keys and expiry time
const PITCHES_CACHE_KEY = 'walls-pitches-cache';
const PITCHES_CACHE_TIMESTAMP_KEY = 'walls-pitches-cache-timestamp';
const PITCHES_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds


interface AgentPitchesProps {
  analyticsData: any;
}

export default function AgentPitches({ analyticsData }: AgentPitchesProps) {
  const { user } = useAuth();
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [totalItems, setTotalItems] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    searchTerm: "",
    pitchedBy: "",
    pitchedTo: "",
    company: "",
    creator: "",
  });

  // Load cached data on initial render
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cachedData = localStorage.getItem(PITCHES_CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(PITCHES_CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          // Check if cache is still valid (not expired)
          if (now - timestamp < PITCHES_CACHE_EXPIRY) {
            const parsedData = JSON.parse(cachedData) as Pitch[];
            setPitches(parsedData);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error loading cached pitches data:", error);
      }
    };
    
    loadCachedData();
  }, []);

  // Add sorting functions
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const hasActiveFilters = () => {
    return false; // Implement this when filters are added
  };

  const fetchPitches = async (pageNumber: number = 1) => {
    if (!user) {
      console.log('No user authenticated, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get authenticated Supabase client
      const supabase = getSupabaseClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('No Supabase session found');
        wallsToast.error("Authentication Error", "Please log in to view pitches");
        setLoading(false);
        return;
      }

      // Step 1: Fetch all pitches with joins to get related data (excluding team to avoid join issues)
      const { data: pitchesData, error: pitchesError } = await supabase
        .from('pitches')
        .select(`
          id,
          timestamp,
          company_website,
          company_id,
          person_id,
          agent_id,
          companies (
            id,
            name,
            website,
            logo_url
          ),
          people (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .order('timestamp', { ascending: false });

      if (pitchesError) {
        console.error("Error fetching pitches:", pitchesError);
        wallsToast.error("Error", "Failed to fetch pitches");
        setPitches([]);
        setLoading(false);
        return;
      }

      console.log(`Fetched ${pitchesData?.length || 0} pitches from Supabase`);

      if (!pitchesData || pitchesData.length === 0) {
        setPitches([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoading(false);
        return;
      }

      // Step 1.5: Fetch team data separately for all unique agent_ids
      const agentIds = Array.from(new Set(pitchesData.map((p: any) => p.agent_id).filter(Boolean)));
      const teamMap = new Map<string, { email: string; first_name: string; last_name: string }>();
      
      if (agentIds.length > 0) {
        const supabaseForTeam = getSupabaseClient();
        const { data: teamData, error: teamError } = await supabaseForTeam
          .from('team')
          .select('id, email, users!team_user_id_fkey(first_name, last_name)')
          .in('id', agentIds);

        if (teamError) {
          console.error("Error fetching team data:", teamError);
        } else if (teamData) {
          teamData.forEach((team: any) => {
            const u = team.users;
            const userRow = Array.isArray(u) ? u[0] : u;
            teamMap.set(team.id, {
              email: team.email || '',
              first_name: userRow?.first_name || '',
              last_name: userRow?.last_name || ''
            });
          });
        }
      }

      // Step 2: Fetch all pitches_creators to get creator associations with profile names
      const pitchIds = pitchesData.map(p => p.id);
      
      if (pitchIds.length === 0) {
        console.log("No pitch IDs found");
        setPitches([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoading(false);
        return;
      }

      const supabaseForCreators = getSupabaseClient();
      const { data: pitchesCreatorsData, error: creatorsError } = await supabaseForCreators
        .from('pitches_creators')
        .select(`
          pitch_id,
          talent_id,
          talent!inner (
            id,
            first_name,
            last_name,
            walls_email,
            profile_id
          )
        `)
        .in('pitch_id', pitchIds);

      if (creatorsError) {
        console.error("Error fetching pitches_creators:", creatorsError);
      }

      console.log("Pitches creators data:", pitchesCreatorsData);
      console.log("Number of pitches_creators records:", pitchesCreatorsData?.length || 0);

      // Step 3: Get profile_ids and fetch profiles separately
      const profileIds = new Set<string>();
      const talentToProfileMap = new Map<string, string>();
      
      if (pitchesCreatorsData) {
        pitchesCreatorsData.forEach((pc: any) => {
          if (pc.talent?.profile_id) {
            profileIds.add(pc.talent.profile_id);
            talentToProfileMap.set(pc.talent.id, pc.talent.profile_id);
          }
        });
      }

      // Fetch profiles in batch
      let profilesMap = new Map<string, string>();
      if (profileIds.size > 0) {
        const supabaseForProfiles = getSupabaseClient();
        const { data: profilesData, error: profilesError } = await supabaseForProfiles
          .from('profiles')
          .select('id, name')
          .in('id', Array.from(profileIds));

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        } else if (profilesData) {
          profilesData.forEach((profile: any) => {
            if (profile.name) {
              profilesMap.set(profile.id, profile.name);
            }
          });
        }
      }

      // Step 4: Create maps of pitch_id to creators and profile names
      const creatorsMap = new Map<string, string[]>();
      const profileNamesMap = new Map<string, string[]>();
      if (pitchesCreatorsData) {
        pitchesCreatorsData.forEach((pc: any) => {
          if (!creatorsMap.has(pc.pitch_id)) {
            creatorsMap.set(pc.pitch_id, []);
            profileNamesMap.set(pc.pitch_id, []);
          }
          const talent = pc.talent;
          if (talent) {
            const creatorName = talent.first_name && talent.last_name
              ? `${talent.first_name} ${talent.last_name}`
              : talent.walls_email || 'Unknown Creator';
            creatorsMap.get(pc.pitch_id)!.push(creatorName);
            
            // Get profile name from the profilesMap
            const profileId = talent.profile_id;
            if (profileId && profilesMap.has(profileId)) {
              const profileName = profilesMap.get(profileId);
              if (profileName) {
                profileNamesMap.get(pc.pitch_id)!.push(profileName);
              }
            }
          }
        });
      }

      console.log("Creators map:", Array.from(creatorsMap.entries()));
      console.log("Profile names map:", Array.from(profileNamesMap.entries()));

      // Step 5: Transform pitches data to match Pitch interface
      let allPitchesData: Pitch[] = pitchesData.map((pitch: any) => {
        const company = pitch.companies;
        const person = pitch.people;
        const teamMember = pitch.agent_id ? teamMap.get(pitch.agent_id) : null;
        const creators = creatorsMap.get(pitch.id) || [];
        const profileNames = profileNamesMap.get(pitch.id) || [];

        // Get pitchedTo email or name
        let pitchedTo = '';
        if (person) {
          pitchedTo = person.email || 
                     (person.first_name && person.last_name 
                       ? `${person.first_name} ${person.last_name}` 
                       : 'Unknown');
        }

        // Get sentBy email or name from team data
        let sentBy = '';
        if (teamMember) {
          sentBy = teamMember.email || 
                  (teamMember.first_name && teamMember.last_name 
                    ? `${teamMember.first_name} ${teamMember.last_name}` 
                    : 'Unknown');
        }

        // Get company website
        const companyWebsite = company?.website || pitch.company_website || '';

        return {
          id: pitch.id,
          pitchedTo: pitchedTo,
          sentBy: sentBy,
          timestamp: pitch.timestamp,
          creators: creators,
          creatorProfileNames: profileNames,
          companyWebsite: companyWebsite,
          companyLogoUrl: company?.logo_url || undefined
        };
      });

      // Step 5: Apply filters
      if (filters.searchTerm) {
        const searchTerms = filters.searchTerm.toLowerCase().split(' ');
        allPitchesData = allPitchesData.filter(pitch => {
          return searchTerms.every(term => {
            const matchesPitchedTo = pitch.pitchedTo?.toLowerCase().includes(term);
            const matchesCompany = pitch.companyWebsite?.toLowerCase().includes(term);
            const matchesCreators = pitch.creators?.some(creator => 
              creator.toLowerCase().includes(term)
            );
            const matchesSentBy = pitch.sentBy?.toLowerCase().includes(term);
            
            return matchesPitchedTo || matchesCompany || matchesCreators || matchesSentBy;
          });
        });
      }

      if (filters.pitchedBy) {
        allPitchesData = allPitchesData.filter(pitch => 
          pitch.sentBy.toLowerCase().includes(filters.pitchedBy.toLowerCase())
        );
      }

      if (filters.pitchedTo) {
        allPitchesData = allPitchesData.filter(pitch => 
          pitch.pitchedTo.toLowerCase().includes(filters.pitchedTo.toLowerCase())
        );
      }

      if (filters.company) {
        allPitchesData = allPitchesData.filter(pitch => 
          pitch.companyWebsite.toLowerCase().includes(filters.company.toLowerCase())
        );
      }

      if (filters.creator) {
        allPitchesData = allPitchesData.filter(pitch => 
          pitch.creators.some(creator => 
            creator.toLowerCase().includes(filters.creator.toLowerCase())
          )
        );
      }

      // Step 6: Sort by timestamp
      allPitchesData.sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
      });

      // Step 7: Calculate pagination
      const filteredTotal = allPitchesData.length;
      const totalPages = Math.ceil(filteredTotal / ITEMS_PER_PAGE);
      setTotalPages(totalPages);
      setTotalItems(filteredTotal);

      // Step 8: Get the current page's data
      const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const pageData = allPitchesData.slice(startIndex, endIndex);
      
      setPitches(pageData);
      setCurrentPage(pageNumber);
      setLoading(false);

      // Cache the updated data
      try {
        localStorage.setItem(PITCHES_CACHE_KEY, JSON.stringify(pageData));
        localStorage.setItem(PITCHES_CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.error("Error caching pitches data:", error);
      }
    } catch (error) {
      console.error("Error fetching pitches:", error);
      setLoading(false);
    }
  };

  const handleFilterChange = (filterKey: string, value: string) => {
    console.log("Filter changed:", filterKey, value); // Debug log
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Effect to refetch when filters change
  useEffect(() => {
    if (user) {
      console.log("Filters updated, fetching pitches:", filters); // Debug log
      setLoading(true);
      fetchPitches(1);
    }
  }, [user, filters, sortDirection]);

  const handlePageChange = (page: number) => {
    fetchPitches(page);
  };

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return 'No date';
    
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleImageError = (pitchId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [pitchId]: true
    }));
  };

  const getPaginationInfo = () => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    return `${start}-${end} of ${totalItems}`;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className={`flex-1 transition-all duration-200 ease-in-out ${
        isFilterOpen ? "ml-80 w-[calc(100%-320px)]" : "w-full"
      }`}>
        <div className="max-w-[90%] mx-auto mt-4 px-4">
          <PitchesSorter 
            isFilterOpen={isFilterOpen}
            setIsFilterOpen={setIsFilterOpen}
            hasActiveFilters={() => Object.values(filters).some(value => value !== "")}
            toggleSortDirection={toggleSortDirection}
            sortDirection={sortDirection}
            paginationInfo={getPaginationInfo()}
            loading={loading}
          />

          {loading ? (
            <div className="flex flex-col gap-4">
              {[...Array(5)].map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pitches.map((pitch) => (
                <Link href={`/agents/crm/edit-pitches/${pitch.id}`} key={pitch.id} className="block">
                  <Card className="w-full bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 transition-all duration-300 group relative overflow-hidden hover:cursor-pointer hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                    <CardContent className="p-4 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                          <Image
                            src={
                              !imageErrors[pitch.id] && pitch.companyLogoUrl
                                ? pitch.companyLogoUrl
                                : FALLBACK_ICON_URL
                            }
                            alt={`Company logo`}
                            width={50}
                            height={50}
                            className={
                              imageErrors[pitch.id] || !pitch.companyLogoUrl
                                ? "rounded-full object-cover border border-neutral-200"
                                : "rounded-full object-contain bg-white flex items-center justify-center"
                            }
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const fallbackUrl = FALLBACK_ICON_URL;
                              if (!imageErrors[pitch.id] && pitch.companyLogoUrl) {
                                handleImageError(pitch.id);
                                if (target.src !== fallbackUrl) {
                                  target.src = fallbackUrl;
                                }
                              } else if (target.src !== fallbackUrl) {
                                target.src = fallbackUrl;
                              }
                            }}
                          />
                          <div className="flex-1 grid grid-cols-6 gap-4">
                            <div className={`${isFilterOpen ? 'col-span-2' : 'col-span-2'} max-w-[325px] flex flex-col justify-center`}>
                              <p className="text-sm font-bold text-foreground truncate">
                                To: {pitch.pitchedTo}
                              </p>
                            </div>
                            <div className={`flex justify-center ${isFilterOpen ? 'col-span-2' : 'col-span-1'}`}>
                              <span className="border-r border-gray-300 -ml-16 mr-4 h-12" />
                              <div className="flex flex-col justify-center">
                                <p className="text-sm font-light text-foreground">
                                  {pitch.sentBy}
                                </p>
                                <p className="text-sm text-muted-foreground font-light">
                                  From
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <div className="flex flex-col justify-center">
                                <p className="text-sm font-light text-foreground">
                                  {formatDate(pitch.timestamp)}
                                </p>
                                <p className="text-sm text-muted-foreground font-light">
                                  Date
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <div className="flex flex-col justify-center">
                                <p className="text-sm font-light text-foreground">
                                  {pitch.creators.length === 1 && pitch.creatorProfileNames.length > 0
                                    ? pitch.creatorProfileNames[0]
                                    : pitch.creators.length === 1
                                    ? '1 creator'
                                    : `${pitch.creators.length} creators`}
                                </p>
                                <p className="text-sm text-muted-foreground font-light">
                                  {pitch.creators.length === 1 ? 'Creator Pitched' : 'Creators Pitched'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
      <PitchesFilter
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
} 