"use client";

import { useState, useEffect, useCallback } from "react";
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { Loader2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddRelationshipPopup from "./add-relationship-popup";

const FALLBACK_IMAGE_URL = FALLBACK_ICON_URL;

interface BrandRepresentationProps {
  companyId: string;
}

interface RepresentationRecord {
  id: string;
  from_company_id: string;
  to_company_id: string;
  relationship_type: string;
  is_exclusive: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  to_company: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
    industry: string | null;
  };
}

export default function BrandRepresentation({ companyId }: BrandRepresentationProps) {
  const [representations, setRepresentations] = useState<RepresentationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);

  const fetchRepresentations = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();

      // Fetch representation records with joined company data
      const { data, error: fetchError } = await supabase
        .from('companies_representation')
        .select(`
          id,
          from_company_id,
          to_company_id,
          relationship_type,
          is_exclusive,
          is_active,
          notes,
          created_at,
          updated_at,
          to_company:companies!companies_representation_to_fkey(
            id,
            name,
            logo_url,
            website,
            industry
          )
        `)
        .eq('from_company_id', companyId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching representations:', fetchError);
        setError('Failed to load representation data');
        return;
      }

      // Transform the data to match our interface
      const transformedData: RepresentationRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        from_company_id: item.from_company_id,
        to_company_id: item.to_company_id,
        relationship_type: item.relationship_type,
        is_exclusive: item.is_exclusive,
        is_active: item.is_active,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        to_company: item.to_company || {
          id: item.to_company_id,
          name: 'Unknown Company',
          logo_url: null,
          website: null,
          industry: null,
        },
      }));

      setRepresentations(transformedData);
    } catch (err) {
      console.error('Error in fetchRepresentations:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchRepresentations();
  }, [fetchRepresentations]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRelationshipType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleAddRelationship = () => {
    console.log('Add relationship clicked, setting popup open to true');
    setIsAddPopupOpen(true);
  };

  const handleRelationshipAdded = () => {
    fetchRepresentations();
  };

  const removeRelationship = async (representationId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('companies_representation')
        .delete()
        .eq('id', representationId);

      if (error) {
        console.error('Error removing relationship:', error);
        return;
      }

      fetchRepresentations();
    } catch (err) {
      console.error('Error removing relationship:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-neutral-500">{error}</p>
      </div>
    );
  }

  if (representations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] py-12">
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAddRelationship();
          }}
          variant="ghost"
          className="relative hover:bg-transparent p-0"
        >
          <motion.div
            className="relative z-10 p-3 bg-neutral-200/80 backdrop-blur-md rounded-full border border-neutral-200/50 px-6 pointer-events-none"
            whileHover={{
              backgroundColor: "rgb(229 229 229)",
              borderColor: "rgb(229 229 229)",
              boxShadow: "inset 0 3px 6px rgba(0, 0, 0, 0.25)",
              y: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            style={{
              boxShadow: "none",
              y: 0,
            }}
          >
            <span className="font-light text-slate-600">+ Add relationship</span>
          </motion.div>
        </Button>
        <AddRelationshipPopup
          isOpen={isAddPopupOpen}
          onClose={() => setIsAddPopupOpen(false)}
          fromCompanyId={companyId}
          onRelationshipAdded={handleRelationshipAdded}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAddRelationship();
          }}
          variant="ghost"
          className="relative hover:bg-transparent p-0"
        >
          <motion.div
            className="relative z-10 p-3 bg-neutral-200/80 backdrop-blur-md rounded-full border border-neutral-200/50 px-6 pointer-events-none"
            whileHover={{
              backgroundColor: "rgb(229 229 229)",
              borderColor: "rgb(229 229 229)",
              boxShadow: "inset 0 3px 6px rgba(0, 0, 0, 0.25)",
              y: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            style={{
              boxShadow: "none",
              y: 0,
            }}
          >
            <span className="font-light text-slate-600">+ Add relationship</span>
          </motion.div>
        </Button>
      </div>
      <div className="rounded-[20px] border border-neutral-200 overflow-hidden bg-white/80">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-100/80">
              <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Exclusive</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Notes</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {representations.map((representation) => (
              <tr
                key={representation.id}
                className={cn(
                  "group border-b border-neutral-100 last:border-0",
                  "hover:bg-neutral-50/80"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Image
                      src={representation.to_company.logo_url || FALLBACK_IMAGE_URL}
                      alt=""
                      width={24}
                      height={24}
                      className={representation.to_company.logo_url ? "rounded-full object-contain aspect-square w-6 h-6 shrink-0 bg-white" : "rounded-full object-cover aspect-square w-6 h-6 shrink-0"}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = FALLBACK_IMAGE_URL;
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="font-normal text-foreground">
                        {representation.to_company.name}
                      </span>
                      {representation.to_company.industry && (
                        <span className="text-xs text-neutral-500">
                          {representation.to_company.industry}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-normal text-foreground">
                    {formatRelationshipType(representation.relationship_type)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "text-sm font-normal",
                    representation.is_active ? "text-green-700" : "text-neutral-600"
                  )}>
                    {representation.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "text-sm font-normal",
                    representation.is_exclusive ? "text-blue-700" : "text-neutral-600"
                  )}>
                    {representation.is_exclusive ? "Exclusive" : "Non-Exclusive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-normal text-neutral-600">
                    {formatDate(representation.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-normal text-neutral-600">
                    {representation.notes || '—'}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:bg-neutral-200"
                        aria-label="Open menu"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        onClick={() => removeRelationship(representation.id)}
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddRelationshipPopup
        isOpen={isAddPopupOpen}
        onClose={() => setIsAddPopupOpen(false)}
        fromCompanyId={companyId}
        onRelationshipAdded={handleRelationshipAdded}
      />
    </div>
  );
}
