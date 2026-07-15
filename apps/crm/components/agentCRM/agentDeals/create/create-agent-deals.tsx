"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { HoldRevealDeleteCloseXButton } from "@/components/ui/hold-reveal-delete-close-x-button";
import { Loader2, Save, Expand, Minimize, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet-view";
import { cn } from "@/lib/utils";
import BasicInformation from "../tabs/general";
import Deliverables from "../tabs/deliverables";
import Contract from "../tabs/contract";
import Documents from "../tabs/documents";
import Architecture, { type DealCommissionRow } from "../tabs/architecture";
import Invoicing from "../tabs/invoiceTab/invoicing";
import SystemInformation from "../tabs/system-information";
import Image from "next/image";

/** Shape for formData.deliverables (matches deal_deliverables + UI helpers) */
interface Deliverable {
  id?: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price_cents: number;
  currency: string;
  billing_type: "one_off" | "recurring" | "time_based";
  billing_interval?: string | null;
  starts_at?: string | null;
  recurrence_count?: number | null;
  /** Net payout days (number of days after net_payout_start to calculate payout date) */
  net_payout?: number | null;
  /** Key-value entries for details JSONB (form state) */
  detailsEntries?: [string, string][];
  /** @deprecated use name */
  type?: string;
  /** @deprecated use unit_price_cents/100 */
  price_per?: number;
}

function detailsEntriesToObject(entries: [string, string][] | undefined): Record<string, string> | null {
  if (!entries?.length) return null;
  const obj: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (key?.trim()) obj[key.trim()] = value ?? "";
  }
  return Object.keys(obj).length > 0 ? obj : null;
}

interface CreateAgentDealsProps {
  analyticsData?: any;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a deal is successfully created. Use to refresh the deals list when embedded. */
  onSuccess?: () => void;
}

/** Match edit/view deal panel surface and header icon controls. */
const DEAL_VIEW_SHEET_PANEL_SURFACE = "bg-gray-50 border border-neutral-200/80";
const dealSheetHeaderIconButtonClass =
  "w-10 h-10 p-0 text-slate-600 hover:bg-transparent active:bg-transparent focus-visible:bg-transparent flex items-center justify-center shadow-none relative group flex-shrink-0 disabled:opacity-50";
const dealSheetHeaderIconInnerClass = cn(
  "relative z-10 p-3 rounded-full transition-all duration-300 ease-in-out",
  "group-hover:bg-gray-100 group-hover:border group-hover:border-neutral-200 group-hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] group-hover:scale-95",
);

const calculatePayoutDate = (liveDueDate: string, payoutNet: string): string => {
  if (!liveDueDate) {
    console.log("No live due date provided for payout calculation");
    return '';
  }
  
  try {
    const date = new Date(liveDueDate);
    if (isNaN(date.getTime())) {
      console.log("Invalid live due date format:", liveDueDate);
      return '';
    }
    
    const days = parseInt(payoutNet) || 0;
    date.setDate(date.getDate() + days);
    
    // Format as ISO string but only take the date part
    const result = date.toISOString().split('T')[0];
    console.log(`Calculated payout date: ${result} from live date ${liveDueDate} + ${days} days`);
    return result;
  } catch (error) {
    console.error('Error calculating payout date:', error);
    return '';
  }
};

const calculateExpectedNet = (amount: string, split: string, probability: string): string => {
  try {
    const amountValue = parseFloat(amount) || 0;
    const splitValue = parseFloat(split) || 0;
    const probabilityValue = parseFloat(probability) || 0;
    
    const companyCommission = amountValue * (splitValue / 100);
    const expectedNet = companyCommission * (probabilityValue / 100);
    
    return expectedNet.toFixed(2);
  } catch (error) {
    console.error('Error calculating expected net:', error);
    return '0';
  }
};

const calculateExpectedRevenue = (amount: string, probability: string): string => {
  try {
    const amountValue = parseFloat(amount) || 0;
    const probabilityValue = parseFloat(probability) || 0;
    
    const expectedRevenue = amountValue * (probabilityValue / 100);
    
    return expectedRevenue.toFixed(2);
  } catch (error) {
    console.error('Error calculating expected revenue:', error);
    return '0';
  }
};

const parseDeliverables = (data: any): Deliverable[] => {
  if (!data.deliverables) return [];
  if (!Array.isArray(data.deliverables)) {
  try {
    return JSON.parse(data.deliverables);
  } catch {
    return [];
  }
  }
  return data.deliverables.map((d: any) => {
    const detailsEntries = d.detailsEntries ?? (d.details ? Object.entries(d.details as Record<string, string>) : []);
    if (d.name != null && d.unit_price_cents != null) {
      return { ...d, detailsEntries };
    }
    return {
      id: d.id,
      name: d.name ?? d.type ?? "",
      description: d.description ?? null,
      quantity: Number(d.quantity) ?? 1,
      unit_price_cents: Number(d.unit_price_cents) ?? Math.round((Number(d.price_per) ?? 0) * 100),
      currency: d.currency ?? "USD",
      billing_type: d.billing_type === "recurring" ? "recurring" : d.billing_type === "time_based" ? "time_based" : "one_off",
      billing_interval: d.billing_type === "recurring" ? (d.billing_interval ?? "monthly") : null,
      starts_at: d.starts_at ?? null,
      recurrence_count: d.recurrence_count ?? null,
      net_payout: d.net_payout ?? null,
      detailsEntries,
    };
  });
};

// Helper function to create deal-related tasks
const createDealTask = async (
  dateField: string, 
  date: string, 
  company: string, 
  creator: string, 
  stageTitle: string,
  userId: string,
  dealId: string
) => {
  if (!date) return null; // Skip if date is empty
  
  try {
    const supabase = getSupabaseClient();
    
    // Format the date properly based on its format
    let taskDate;
    
    // Handle different date formats
    if (date.includes('T')) { // ISO format
      taskDate = new Date(date);
    } else { // YYYY-MM-DD format (especially for payout date)
      const [year, month, day] = date.split('-').map(num => parseInt(num));
      taskDate = new Date(year, month - 1, day); // month is 0-indexed
    }
    
    if (isNaN(taskDate.getTime())) {
      console.error(`Invalid date format for ${stageTitle}: ${date}`);
      return null;
    }
    
    // Set time to 9:00 AM
    taskDate.setHours(9, 0, 0, 0);
    
    // Create end date 30 minutes later for scheduling
    const endDate = new Date(taskDate);
    endDate.setMinutes(endDate.getMinutes() + 30);
    
    console.log(`Creating task for ${stageTitle} with date: ${taskDate.toISOString()}`);
    
    // First, check for and delete any existing tasks for this deal and stage
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('deal_id', dealId)
      .eq('deal_task_type', stageTitle);
    
    // Delete any existing tasks for this deal and stage
    if (existingTasks && existingTasks.length > 0) {
      for (const task of existingTasks) {
        await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id);
        console.log(`Deleted existing task ${task.id} for ${stageTitle}`);
      }
    }
    
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        name: `${company || 'Deal'} x ${creator} | ${stageTitle}`,
        description: `Deal task: ${stageTitle}`,
        attachments: [],
        project: '',
        assignee: userId,
        status: 'todo',
        priority: 'medium',
        duration: '30',
        start_date: taskDate.toISOString(),
        deadline: taskDate.toISOString(),
        hard_deadline: true,
        schedule: 'work',
        labels: ['deal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: userId,
        schedule_start: taskDate.toISOString(),
        schedule_end: endDate.toISOString(),
        event_type: 'deal',
        deal_task_type: stageTitle,
        deal_date_field: dateField,
        deal_id: dealId
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return newTask?.id || null;
  } catch (error) {
    console.error(`Error creating ${stageTitle} task:`, error);
    return null;
  }
};

export default function CreateAgentDeals({ analyticsData, isOpen, onClose, onSuccess }: CreateAgentDealsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [contractSignedOrder, setContractSignedOrder] = useState<number | null>(null);
  const [stages, setStages] = useState<Array<{ name: string; order: number }>>([]);
  const [formData, setFormData] = useState({
    creator: "",
    company: "",
    dealName: "",
    amount: "",
    payoutNet: "30",
    leadSource: "",
    deliverables: [] as Deliverable[],
    submissionDueDate: "",
    liveDueDate: "",
    stage: "",
    pointOfContact: "",
    ideationDueDate: "",
    split: "",
    dealOwner: user?.id || "",
    expectedNet: "",
    nextStep: "",
    expectedRevenue: "",
    payoutDate: "",
    probability: "",
    conceptSubmissionDate: "",
    pipeline: "partnership",
    companyWebsite: "",
    creatorProfilePicture: "",
    contractFile: null as File | null,
    contractFileName: "",
    contractFileUrl: "",
    dealTalent: [] as { id?: string; talent_id: string; talent_name: string; avatar_url?: string; role?: string; revenue_share_bps?: number }[],
    dealCommissions: [] as DealCommissionRow[],
    dealDocuments: [] as { id?: string; file_name: string; file_url: string; mime_type: string; document_type: string; name?: string | null }[],
    dealContacts: [] as { id?: string; person_id: string; first_name: string; last_name: string; email?: string | null; role?: string | null; photo_url?: string | null }[],
    dealCompanies: [] as any[],
    invoiceVendorCompanyId: null as string | null,
    invoiceVendorInfo: { legal_name: '', city: '', state: '', country: '', address: '', post_code: '', vendor_email: '' },
    invoiceVendorInfoId: null as string | null,
    events: [] as any[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true); // Default to expanded (opposite of view)
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [isHoldingComplete, setIsHoldingComplete] = useState(false);
  const [companyWebsite, setCompanyWebsite] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [creatorProfilePicture, setCreatorProfilePicture] = useState<string>('');

  const [isUserAdmin, setIsUserAdmin] = useState(false);

  // Default pipeline to Partnership whenever the create sheet is opened (component often stays mounted).
  useEffect(() => {
    if (!isOpen) return;
    setFormData((prev) => ({ ...prev, pipeline: "partnership" }));
  }, [isOpen]);

  // Ensure create form defaults Deal Owner to signed-in user once auth finishes loading.
  useEffect(() => {
    if (!user?.id) return;
    setFormData((prev) => {
      if ((prev.dealOwner ?? "").trim()) return prev;
      return { ...prev, dealOwner: user.id };
    });
  }, [user?.id]);

  // Keep Deal Owner prefilled in Architecture > Commission Splits.
  useEffect(() => {
    const ownerUserId = formData.dealOwner;
    if (!ownerUserId) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();

        const [{ data: ownerUser }, { data: ownerDefault }] = await Promise.all([
          supabase
            .from("users")
            .select("id, first_name, last_name, email, avatar_url")
            .eq("id", ownerUserId)
            .maybeSingle(),
          supabase
            .from("user_commission_defaults")
            .select("commission_bps")
            .eq("user_id", ownerUserId)
            .maybeSingle(),
        ]);

        if (cancelled || !ownerUser) return;

        const defaultBps = Number(ownerDefault?.commission_bps) || 0;
        setFormData((prev: any) => {
          const current = (prev.dealCommissions || []) as Array<any>;
          const existingIndex = current.findIndex((row) => row.user_id === ownerUserId);

          if (existingIndex >= 0) {
            const existing = current[existingIndex];
            const next = [...current];
            next[existingIndex] = {
              ...existing,
              user_id: ownerUserId,
              first_name: existing.first_name ?? ownerUser.first_name ?? "",
              last_name: existing.last_name ?? ownerUser.last_name ?? "",
              email: existing.email ?? ownerUser.email ?? null,
              avatar_url: existing.avatar_url ?? ownerUser.avatar_url ?? null,
              commission_bps:
                existing.commission_bps == null || existing.commission_bps === ""
                  ? defaultBps
                  : Number(existing.commission_bps),
              role: "Owner",
            };
            return { ...prev, dealCommissions: next };
          }

          return {
            ...prev,
            dealCommissions: [
              ...current,
              {
                user_id: ownerUserId,
                first_name: ownerUser.first_name ?? "",
                last_name: ownerUser.last_name ?? "",
                email: ownerUser.email ?? null,
                avatar_url: ownerUser.avatar_url ?? null,
                commission_bps: defaultBps,
                role: "Owner",
              },
            ],
          };
        });
      } catch (error) {
        console.warn("Failed to prefill owner commission row:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.dealOwner]);

  const handleHoldStart = () => {
    setIsHoldingComplete(false);
  };

  const handleHoldComplete = () => {
    setIsHoldingComplete(true);
    setShowDeleteButton(true);
  };

  const cancelHold = () => {
    if (!isHoldingComplete) {
      setShowDeleteButton(false);
    }
    setIsHoldingComplete(false);
  };

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isHoldingComplete) return;
    setShowDeleteButton(false);
    onClose();
  };

  useEffect(() => {
    if (!user?.id) {
      setIsUserAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from("users").select("is_admin").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setIsUserAdmin(false);
        return;
      }
      setIsUserAdmin(data.is_admin === true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'basic', name: 'General' },
      { id: 'architecture', name: 'Architecture' },
      { id: 'terms', name: 'Deliverables' },
      { id: 'documents', name: 'Documents' },
    ];

    // Only include contract tab if stage order is >= contract signed order (before Invoicing)
    if (contractSignedOrder !== null && formData.stage) {
      const currentStageOrder = stages.find(s => s.name === formData.stage)?.order;
      if (currentStageOrder !== undefined && currentStageOrder !== null && currentStageOrder >= contractSignedOrder) {
        baseTabs.push({ id: 'contract', name: 'Contract' });
      }
    }

    baseTabs.push({ id: 'invoicing', name: 'Invoicing' });
    baseTabs.push({ id: 'system-information', name: 'System Information' });
    return baseTabs;
  }, [contractSignedOrder, formData.stage, stages]);

  // Add effect to handle tab changes when stage changes
  useEffect(() => {
    if (activeTab === 'contract' && contractSignedOrder !== null && formData.stage) {
      const currentStageOrder = stages.find(s => s.name === formData.stage)?.order;
      if (currentStageOrder === undefined || currentStageOrder === null || currentStageOrder < contractSignedOrder) {
        setActiveTab('basic');
      }
    }
  }, [formData.stage, contractSignedOrder, stages, activeTab]);

  // Fetch company and creator data
  useEffect(() => {
    const fetchCompanyAndCreatorData = async () => {
      try {
        const supabase = getSupabaseClient();
        // Fetch company data
        if (formData.company) {
          const { data: companies } = await supabase
            .from('companies')
            .select('id, name, website, logo_url')
            .eq('name', formData.company)
            .limit(1);
          
          if (companies && companies.length > 0) {
            setCompanyWebsite(companies[0].website || '');
            setCompanyLogo(companies[0].logo_url || '');
          }
        }

        // Fetch creator data - need to match by name (first_name + last_name)
        if (formData.creator) {
          const nameParts = formData.creator.split(' ');
          if (nameParts.length >= 2) {
            const { data: talent } = await supabase
              .from('talent')
              .select('id, first_name, last_name, avatar_url')
              .eq('first_name', nameParts[0])
              .eq('last_name', nameParts.slice(1).join(' '))
              .limit(1);
            
            if (talent && talent.length > 0) {
              setCreatorProfilePicture(talent[0].avatar_url || '');
            }
          }
        }
      } catch (error) {
        console.error("Error fetching company and creator data:", error);
      }
    };

    if (formData.company || formData.creator) {
      fetchCompanyAndCreatorData();
    }
  }, [formData.company, formData.creator]);

  // Fetch deal_stages for tab order and Contract Signed visibility
  useEffect(() => {
    const fetchStageData = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: dealStages } = await supabase
          .from('deal_stages')
          .select('id, name, slug, order_index')
          .order('order_index', { ascending: true });

        if (dealStages?.length) {
          const stagesData = dealStages.map((s: any) => ({
            id: s.id,
            name: s.name || '',
            order: s.order_index ?? 999,
          }));
          setStages(stagesData);
          const contractSigned = stagesData.find((s: { name: string }) => s.name === "Contract Signed");
          if (contractSigned) setContractSignedOrder(contractSigned.order);
        }
      } catch (error) {
        console.error("Error fetching stage data:", error);
      }
    };

    fetchStageData();
  }, []);

  // Fetch commission when deal owner changes
  useEffect(() => {
    const fetchCommission = async (dealOwnerId: string) => {
      try {
        // Fetch from team table (deal_owner references team.id)
        const supabase = getSupabaseClient();
        const { data: teamMember } = await supabase
          .from('team')
          .select('commission')
          .eq('id', dealOwnerId)
          .single();

        if (teamMember?.commission) {
          setFormData((prev) => ({ ...prev, split: teamMember.commission.toString() || "0" }));
        }
      } catch (error) {
        console.error("Error fetching commission:", error);
      }
    };

    if (formData.dealOwner) {
      fetchCommission(formData.dealOwner);
    }
  }, [formData.dealOwner]);

  // Calculate derived fields when dependencies change
  useEffect(() => {
    if (formData.liveDueDate || formData.payoutNet) {
      const payoutDate = calculatePayoutDate(formData.liveDueDate, formData.payoutNet);
      setFormData(prev => ({ ...prev, payoutDate }));
    }
  }, [formData.liveDueDate, formData.payoutNet]);

  useEffect(() => {
    if (formData.amount || formData.probability) {
      const expectedRevenue = calculateExpectedRevenue(formData.amount, formData.probability);
      setFormData(prev => ({ ...prev, expectedRevenue }));
    }
  }, [formData.amount, formData.probability]);

  useEffect(() => {
    if (formData.amount || formData.split || formData.probability) {
      const expectedNet = calculateExpectedNet(formData.amount, formData.split, formData.probability);
      setFormData(prev => ({ ...prev, expectedNet }));
    }
  }, [formData.amount, formData.split, formData.probability]);

  const handleSave = async () => {
    if (!user) {
      wallsToast.error("Error", "You must be logged in to create a deal");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = getSupabaseClient();
      
      // Get company ID
      let companyId = null;
      if (formData.company) {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('name', formData.company)
          .single();
        companyId = company?.id;
      }
      
      // Get deal stage ID
      let dealStageId = null;
      if (formData.stage) {
        const { data: stage } = await supabase
          .from('deal_stages')
          .select('id')
          .eq('name', formData.stage)
          .single();
        dealStageId = stage?.id;
      }
      
      // Create main deal record
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          deal_name: formData.dealName || '',
          source: formData.leadSource || 'inbound-agency-email',
          deal_type: formData.pipeline || null,
          deal_stage_id: dealStageId,
          deal_owner: formData.dealOwner || user.id,
          vendor_company_id: formData.invoiceVendorCompanyId || null,
        })
        .select()
        .single();
      
      if (dealError || !deal) {
        throw dealError || new Error("Failed to create deal");
      }
      
      const dealId = deal.id;
      
      // Create deal_companies
      if (companyId) {
        await supabase.from('deal_companies').insert({
          deal_id: dealId,
          company_id: companyId,
          role: 'client',
        });
      }
      
      // Get deal_company_id for deal_contacts
      const { data: dealCompanyRows } = await supabase
        .from('deal_companies')
        .select('id')
        .eq('deal_id', dealId)
        .limit(1);
      const dealCompanyId = dealCompanyRows?.[0]?.id || null;
      
      // Create deal_contacts
      const dealContactsList = formData.dealContacts || [];
      if (dealContactsList.length > 0 && dealCompanyId) {
        await supabase.from('deal_contacts').insert(
          dealContactsList.map((c: { person_id: string; role?: string | null }) => ({
            deal_id: dealId,
            deal_company_id: dealCompanyId,
            person_id: c.person_id,
            role: c.role ?? null,
          }))
        );
      }
      
      // Create deal_deliverables first so we have ids for event.related_deliverable_id (FK references deal_deliverables).
      // Insert one-by-one so we have a reliable oldId -> newId map (batch insert return order can differ).
      const deliverablesList = (formData.deliverables || []) as Deliverable[];
      const deliverablesToInsert = deliverablesList.filter((d) => (d.name ?? '').trim() !== '');
      const oldDeliverableIdToNewId: Record<string, string> = {};
      for (const d of deliverablesToInsert) {
        const { data: inserted } = await supabase
          .from('deal_deliverables')
          .insert({
            deal_id: dealId,
            name: (d.name ?? '').trim(),
            description: (d.description ?? '').trim() || null,
            quantity: Number(d.quantity) || 1,
            unit_price_cents: Number(d.unit_price_cents) ?? 0,
            currency: d.currency || 'USD',
            billing_type: d.billing_type === 'recurring' ? 'recurring' : d.billing_type === 'time_based' ? 'time_based' : 'one_off',
            billing_interval: d.billing_type === 'recurring' ? (d.billing_interval || null) : null,
            starts_at: d.starts_at || null,
            recurrence_count: d.recurrence_count ?? null,
            net_payout: d.net_payout ?? null,
            details: detailsEntriesToObject(d.detailsEntries) ?? null,
          })
          .select('id')
          .single();
        if (d.id && inserted?.id) oldDeliverableIdToNewId[d.id] = inserted.id;
      }

      // Create deal_documents (contract)
      if (formData.contractFileUrl) {
        const fileName = formData.contractFileName || formData.contractFileUrl?.split('/').pop() || 'contract.pdf';
        await supabase.from('deal_documents').insert({
          deal_id: dealId,
          file_name: fileName,
          file_url: formData.contractFileUrl,
          mime_type: 'application/pdf',
          document_type: 'contract',
        });
      }
      
      // Documents are already saved to Supabase when uploaded, so we don't need to re-insert them
      // Just ensure they're associated with the correct deal_id (in case deal was created during upload)
      const dealDocumentsList = formData.dealDocuments || [];
      if (dealDocumentsList.length > 0) {
        for (const doc of dealDocumentsList) {
          if (doc.id) {
            // Document already exists in database, ensure it has correct deal_id
            // (This handles the case where deal was created during document upload)
            await supabase
              .from('deal_documents')
              .update({ deal_id: dealId })
              .eq('id', doc.id)
              .neq('deal_id', dealId); // Only update if deal_id doesn't match
          } else {
            // Document doesn't have ID, insert it (shouldn't happen if upload worked correctly)
            await supabase.from('deal_documents').insert({
              deal_id: dealId,
              file_name: doc.file_name,
              file_url: doc.file_url,
              mime_type: doc.mime_type || 'application/octet-stream',
              document_type: doc.document_type || 'document',
              uploaded_by: user.id,
              name: (doc as any).name || doc.file_name,
            });
          }
        }
      }
      
      const ownerUserId = formData.dealOwner || user.id;

      // Resolve commission default by user_id for the deal owner.
      const dealTalentList = formData.dealTalent || [];
      let ownerDefaultCommissionBps = 0;
      if (ownerUserId) {
        const { data: ownerDefaultRow } = await supabase
          .from("user_commission_defaults")
          .select("commission_bps")
          .eq("user_id", ownerUserId)
          .maybeSingle();
        ownerDefaultCommissionBps = Number(ownerDefaultRow?.commission_bps) || 0;
      }

      // Create deal_talent
      if (dealTalentList.length > 0) {
        await supabase.from('deal_talent').insert(
          dealTalentList.map((t: any) => ({
            deal_id: dealId,
            talent_id: t.talent_id,
            role: t.role || null,
            revenue_share_bps: t.revenue_share_bps != null && t.revenue_share_bps !== "" ? Number(t.revenue_share_bps) : null,
          }))
        );
      }

      // Create deal_commissions (ensure deal owner is always present as "Owner" with default commission).
      const dealCommissionsList = (formData as any).dealCommissions || [];
      const commissionRowsByUserId = new Map<
        string,
        { deal_id: string; user_id: string; commission_bps: number; role: string | null }
      >();

      dealCommissionsList.forEach((c: any) => {
        if (!c?.user_id) return;
        commissionRowsByUserId.set(c.user_id, {
          deal_id: dealId,
          user_id: c.user_id,
          commission_bps: Number(c.commission_bps) || 0,
          role: c.role || null,
        });
      });

      commissionRowsByUserId.set(ownerUserId, {
        deal_id: dealId,
        user_id: ownerUserId,
        commission_bps: ownerDefaultCommissionBps,
        role: "Owner",
      });

      if (commissionRowsByUserId.size > 0) {
        await supabase
          .from("deal_commissions")
          .insert(Array.from(commissionRowsByUserId.values()));
      }

      // Upsert vendor information for the selected vendor company
      const vendorCompanyId = formData.invoiceVendorCompanyId;
      const vendorInfo = formData.invoiceVendorInfo;
      if (vendorCompanyId && vendorInfo) {
        const payload = {
          company_id: vendorCompanyId,
          legal_name: (vendorInfo.legal_name ?? '').trim() || '',
          city: (vendorInfo.city ?? '').trim() || null,
          state: (vendorInfo.state ?? '').trim() || null,
          country: (vendorInfo.country ?? '').trim() || null,
          address: (vendorInfo.address ?? '').trim() || null,
          post_code: (vendorInfo.post_code ?? '').trim() || null,
          vendor_email: (vendorInfo.vendor_email ?? '').trim() || null,
        };
        const vendorInfoId = formData.invoiceVendorInfoId;
        if (vendorInfoId) {
          const { error: vendorErr } = await supabase
            .from('companies_vendor_information')
            .update({
              legal_name: payload.legal_name,
              city: payload.city,
              state: payload.state,
              country: payload.country,
              address: payload.address,
              post_code: payload.post_code,
              vendor_email: payload.vendor_email,
            })
            .eq('id', vendorInfoId);
          if (vendorErr) throw vendorErr;
        } else {
          const { error: vendorErr } = await supabase
            .from('companies_vendor_information')
            .insert(payload);
          if (vendorErr) throw vendorErr;
        }
      }

      // Create tasks for each date if present
      // Concept Submission task
      if (formData.conceptSubmissionDate) {
        await createDealTask(
          'conceptSubmissionDate',
          formData.conceptSubmissionDate, 
          formData.dealName || formData.company, 
          formData.creator, 
          'Submit Concept',
          user.id,
          dealId
        );
      }
      
      // Content Submission task
      if (formData.submissionDueDate) {
        await createDealTask(
          'submissionDueDate',
          formData.submissionDueDate, 
          formData.dealName || formData.company, 
          formData.creator, 
          'Submit Content',
          user.id,
          dealId
        );
      }
      
      // Go Live task
      if (formData.liveDueDate) {
        await createDealTask(
          'liveDueDate',
          formData.liveDueDate, 
          formData.dealName || formData.company, 
          formData.creator, 
          'Go Live',
          user.id,
          dealId
        );
      }
      
      // Payment Collection task
      if (formData.payoutDate) {
        await createDealTask(
          'payoutDate',
          formData.payoutDate, 
          formData.dealName || formData.company, 
          formData.creator, 
          'Collect Payment',
          user.id,
          dealId
        );
      }

      wallsToast.success("Success", "Deal created successfully");

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error("Error creating deal:", error);
      wallsToast.error("Error", "Failed to create deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isSubmitting) handleSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className={cn(
          "overflow-y-auto overflow-x-hidden overscroll-contain p-0 [&>button]:hidden shadow-2xl rounded-none",
          DEAL_VIEW_SHEET_PANEL_SURFACE,
          isMaximized ? "w-full" : "w-3/4"
        )}
        style={{
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        <motion.div 
          className="flex flex-col h-full"
          layout
          transition={{
            duration: 0.3,
            ease: "easeInOut"
          }}
        >
          <div className="flex-1 w-full px-6 pt-6 pb-8">
            <div className="mb-4 flex items-center justify-between relative z-[2]">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative w-[100px] h-[70px] flex items-center flex-shrink-0">
                  <Image
                    src={companyLogo || "/images/og-image.png"}
                    alt={`${formData.company || "Company"} Logo`}
                    width={70}
                    height={70}
                    className="absolute left-0 top-0 w-[70px] h-[70px] rounded-full z-10 bg-white object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/og-image.png";
                    }}
                  />
                  <Image
                    src={creatorProfilePicture || "/images/og-image.png"}
                    alt={`${formData.creator || "Creator"} Profile`}
                    width={70}
                    height={70}
                    className="absolute left-10 top-0 w-[70px] h-[70px] rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/og-image.png";
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <h1
                      className="text-5xl font-black text-foreground leading-tight mt-1 min-w-0 truncate"
                      title={formData.dealName || "New Deal"}
                    >
                      {formData.dealName || "New Deal"}
                    </h1>
                    <div className="flex-1 min-w-8 shrink border-t border-black h-[1px]" />
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsMaximized(!isMaximized)}
                        disabled={isSubmitting}
                        className={dealSheetHeaderIconButtonClass}
                      >
                        <div className="relative">
                          <div className={dealSheetHeaderIconInnerClass}>
                            {isMaximized ? (
                              <Minimize className="h-[18px] w-[18px] stroke-[1.5] text-neutral-600" />
                            ) : (
                              <Expand className="h-[18px] w-[18px] stroke-[1.5] text-neutral-600" />
                            )}
                          </div>
                        </div>
                      </Button>
                      <HoldRevealDeleteCloseXButton
                        disabled={isSubmitting}
                        iconButtonClass={dealSheetHeaderIconButtonClass}
                        iconInnerClass={dealSheetHeaderIconInnerClass}
                        onCloseClick={handleCloseClick}
                        onHoldStart={handleHoldStart}
                        onHoldComplete={handleHoldComplete}
                        onHoldInterrupt={cancelHold}
                      />
                      {showDeleteButton && (
                        <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowDeleteButton(false);
                              setIsHoldingComplete(false);
                              onClose();
                            }}
                            disabled={isSubmitting}
                            className={dealSheetHeaderIconButtonClass}
                          >
                            <div className="relative">
                              <div className={dealSheetHeaderIconInnerClass}>
                                <Trash2 className="h-[18px] w-[18px] stroke-[1.5] text-neutral-600" />
                              </div>
                            </div>
                          </Button>
                        </div>
                      )}

                      <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSave}
                          disabled={isSubmitting}
                          className={dealSheetHeaderIconButtonClass}
                        >
                          <div className="relative">
                            <div className={dealSheetHeaderIconInnerClass}>
                              {isSubmitting ? (
                                <Loader2 className="h-[18px] w-[18px] stroke-[1.5] text-neutral-500 animate-spin" />
                              ) : (
                                <Save className="h-[18px] w-[18px] stroke-[1.5] text-neutral-500" />
                              )}
                            </div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs underneath header */}
            <div className="flex space-x-1 items-center -ml-2 mt-8">
                {tabs.map((tab) => {
                  const restrictedTabs = ['documents', 'invoicing', 'system-information'];
                  const isDisabled = restrictedTabs.includes(tab.id) && (!formData.dealName || formData.dealName.trim() === "");
                  
                  return (
                    <Button 
                      key={tab.id}
                      variant="ghost"
                      disabled={isDisabled}
                      className={cn(
                        "relative px-4 py-2 group font-light",
                        isDisabled 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:bg-transparent",
                        activeTab === tab.id 
                          ? "text-neutral-700" 
                          : "text-neutral-700 hover:text-neutral-700"
                      )}
                      onClick={() => {
                        if (!isDisabled) {
                          setActiveTab(tab.id);
                        }
                      }}
                    >
                      {tab.name}
                      <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-neutral-700 transition-all duration-300",
                        activeTab === tab.id ? "w-4/5 mx-auto right-0" : isDisabled ? "w-0" : "w-0 group-hover:w-4/5 group-hover:mx-auto group-hover:right-0"
                      )} />
                    </Button>
                  );
                })}
              </div>

            <div className="space-y-8 relative z-[2]">
              <div className="mt-6">
                {activeTab === 'basic' && (
                  <BasicInformation 
                    formData={formData}
                    setFormData={setFormData}
                    dealId=""
                  />
                )}

                {activeTab === 'architecture' && (
                  <Architecture
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

                {activeTab === 'terms' && (
                  <Deliverables 
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

                {activeTab === 'invoicing' && (
                  <Invoicing
                    formData={formData}
                    setFormData={setFormData}
                    dealId={(formData as any)._dealId ?? (formData as any).dealId ?? null}
                    canManageInvoiceWisePayments={isUserAdmin}
                  />
                )}

                {activeTab === 'documents' && (
                  <Documents
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

                {activeTab === 'system-information' && (
                  <SystemInformation
                    formData={formData}
                    setFormData={setFormData}
                    dealId=""
                  />
                )}

                {activeTab === 'contract' && (
                  <Contract 
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </SheetContent>
      <Toaster />
    </Sheet>
  );
}
