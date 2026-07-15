"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { getSupabaseClient } from "@/app/auth/supabaseClient";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { HoldRevealDeleteCloseXButton } from "@/components/ui/hold-reveal-delete-close-x-button";
import { Loader2, Save, Trash2, Expand, Minimize, Copy } from "lucide-react";
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
import Architecture from "../tabs/architecture";
import Invoicing, { emptyVendorInfo } from "../tabs/invoiceTab/invoicing";
import {
  hasInvoiceDraftChanged,
  persistInvoiceFromFormData,
  type PersistedInvoiceFromForm,
} from "../tabs/invoiceTab/persist-invoice-from-form";
import SystemInformation from "../tabs/system-information";
import Conversations from "../tabs/conversations";
import TimeEntries from "../tabs/time-entries";
import Image from "next/image";
import { AnimatedDealSaveToast } from "./animated-deal-save-toast";

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

/** Panel surface for `SheetContent` — header icon hover uses a step darker so it stays visible on gray-50. */
const DEAL_VIEW_SHEET_PANEL_SURFACE = "bg-gray-50 border border-neutral-200/80";

/** Same pattern as people-table-toolbar + button: no chrome at rest. */
const dealSheetHeaderIconButtonClass =
  "w-10 h-10 p-0 text-slate-600 hover:bg-transparent active:bg-transparent focus-visible:bg-transparent flex items-center justify-center shadow-none relative group flex-shrink-0 disabled:opacity-50";
const dealSheetHeaderIconInnerClass = cn(
  "relative z-10 p-3 rounded-full transition-all duration-300 ease-in-out",
  "group-hover:bg-gray-100 group-hover:border group-hover:border-neutral-200 group-hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] group-hover:scale-95",
);

interface EditAgentDealsProps {
  analyticsData: any;
  dealId: string;
  initialData: {
    creator: string;
    company: string;
    dealName: string;
    amount: string;
    payoutNet: string;
    leadSource: string;
    deliverables: Deliverable[];
    submissionDueDate: string;
    liveDueDate: string;
    stage: string;
    pointOfContact: string;
    ideationDueDate: string;
    split: string;
    dealOwner: string;
    expectedNet: string;
    nextStep: string;
    expectedRevenue: string;
    payoutDate: string;
    probability: string;
    conceptSubmissionDate: string;
    pipeline: string;
    companyWebsite: string;
    creatorProfilePicture: string;
    contractFile?: File | null;
    contractFileName: string;
    contractFileUrl: string;
    dealTalent?: { id?: string; talent_id: string; talent_name: string; avatar_url?: string; role?: string; revenue_share_bps?: number }[];
    dealDocuments?: { id?: string; file_name: string; file_url: string; mime_type: string; document_type: string; name?: string | null }[];
    dealContacts?: { id?: string; person_id: string; first_name: string; last_name: string; email?: string | null; role?: string | null; photo_url?: string | null }[];
  };
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

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

export default function EditAgentDeals({ analyticsData, dealId, initialData, isOpen, onClose, onSaved }: EditAgentDealsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [contractSignedOrder, setContractSignedOrder] = useState<number | null>(null);
  const [stages, setStages] = useState<Array<{ name: string; order: number }>>([]);
  const [formData, setFormData] = useState({
    ...initialData,
    deliverables: parseDeliverables(initialData),
    contractFile: initialData.contractFile || null,
    dealTalent: initialData.dealTalent ?? [],
    dealDocuments: initialData.dealDocuments ?? [],
    dealContacts: initialData.dealContacts ?? [],
    dealCompanies: (initialData as any).dealCompanies ?? [],
    dealCommissions: (initialData as any).dealCommissions ?? [],
    invoiceVendorCompanyId: (initialData as any).invoiceVendorCompanyId ?? null,
    invoiceVendorInfo: {
      ...emptyVendorInfo,
      ...((initialData as any).invoiceVendorInfo ?? {}),
    },
    invoiceVendorInfoId: (initialData as any).invoiceVendorInfoId ?? null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [isHoldingComplete, setIsHoldingComplete] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const isInitialMount = useRef(true);
  const hasChangesRef = useRef(false);
  const savedDataRef = useRef<typeof formData>({
    ...initialData,
    deliverables: parseDeliverables(initialData),
    contractFile: initialData.contractFile || null,
    dealTalent: initialData.dealTalent ?? [],
    dealDocuments: initialData.dealDocuments ?? [],
    dealContacts: initialData.dealContacts ?? [],
    dealCompanies: (initialData as any).dealCompanies ?? [],
    dealCommissions: (initialData as any).dealCommissions ?? [],
    invoiceVendorCompanyId: (initialData as any).invoiceVendorCompanyId ?? null,
    invoiceVendorInfo: {
      ...emptyVendorInfo,
      ...((initialData as any).invoiceVendorInfo ?? {}),
    },
    invoiceVendorInfoId: (initialData as any).invoiceVendorInfoId ?? null,
  } as typeof formData);

  /** Keeps invoice slice of `savedDataRef` aligned with DB-backed form state so opening Invoicing does not look "dirty". */
  const syncInvoiceDraftToSaved = useCallback(
    (p: {
      _invoiceId: string | undefined;
      invoiceDetails: Record<string, unknown>;
      invoiceLineItems: unknown[];
      invoicePayments: unknown[];
    }) => {
      savedDataRef.current = {
        ...savedDataRef.current,
        _invoiceId: p._invoiceId,
        invoiceDetails: p.invoiceDetails as any,
        invoiceLineItems: p.invoiceLineItems as any,
        invoicePayments: p.invoicePayments as any,
      } as typeof formData;
    },
    []
  );

  const [companyWebsite, setCompanyWebsite] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [creatorProfilePicture, setCreatorProfilePicture] = useState<string>('');
  const isPartnershipDeal = (formData.pipeline ?? "").trim().toLowerCase() === "partnership";

  const [isUserAdmin, setIsUserAdmin] = useState(false);

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

    if (formData.pipeline === 'retainer' || formData.pipeline === 'project') {
      baseTabs.push({ id: 'time-entries', name: 'Time Entries' });
    }

    baseTabs.push({ id: 'conversations', name: 'Conversations' });
    baseTabs.push({ id: 'invoicing', name: 'Invoicing' });
    baseTabs.push({ id: 'system-information', name: 'System Information' });
    return baseTabs;
  }, [contractSignedOrder, formData.stage, stages, formData.pipeline]);

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
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, website, logo_url')
          .eq('name', formData.company)
          .limit(1);
        
        if (companies && companies.length > 0) {
          setCompanyWebsite(companies[0].website || '');
          setCompanyLogo(companies[0].logo_url || '');
        }

        // Fetch creator data - need to match by name (first_name + last_name)
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
      } catch (error) {
        console.error("Error fetching company and creator data:", error);
      }
    };

    if (formData.company && formData.creator) {
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

  // Derive _stageIndexOrder from _dealStageId for tabs, and optionally next step from deal_stages
  useEffect(() => {
    const dealStageId = (formData as any)._dealStageId;
    if (!dealStageId || stages.length === 0) return;
    const stageRow = stages.find((s: any) => s.id === dealStageId);
    const order = stageRow?.order ?? null;
    if (order !== null && (formData as any)._stageIndexOrder !== order) {
      setFormData(prev => ({ ...prev, _stageIndexOrder: order }));
    }
  }, [(formData as any)._dealStageId, stages]);

  const handleSave = async () => {
    if (!user) {
      wallsToast.error("Error", "You must be logged in to edit a deal");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = getSupabaseClient();
      
      const { data: existingDeal, error: fetchError } = await supabase
        .from('deals')
        .select('id, deal_name, deal_stage_id, deal_owner')
        .eq('id', dealId)
        .single();
      
      if (fetchError || !existingDeal) {
        throw new Error("Deal not found");
      }
      
      const dealStageId = (formData as any)._dealStageId || (formData as any)._stageId || existingDeal.deal_stage_id;

      const { error: updateDealError } = await supabase
        .from('deals')
        .update({
          deal_name: formData.dealName || existingDeal.deal_name || '',
          source: formData.leadSource || 'inbound-agency-email',
          deal_type: formData.pipeline || null,
          deal_stage_id: dealStageId || null,
          deal_owner: formData.dealOwner || existingDeal.deal_owner || user.id,
          vendor_company_id: (formData as any).invoiceVendorCompanyId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);
      
      if (updateDealError) throw updateDealError;

      // Upsert vendor information for the selected vendor company
      const vendorCompanyId = (formData as any).invoiceVendorCompanyId;
      const vendorInfo = (formData as any).invoiceVendorInfo;
      if (vendorCompanyId && vendorInfo) {
        const payload = {
          legal_name: (vendorInfo.legal_name ?? '').trim() || '',
          city: (vendorInfo.city ?? '').trim() || null,
          state: (vendorInfo.state ?? '').trim() || null,
          country: (vendorInfo.country ?? '').trim() || null,
          address: (vendorInfo.address ?? '').trim() || null,
          post_code: (vendorInfo.post_code ?? '').trim() || null,
          vendor_email: (vendorInfo.vendor_email ?? '').trim() || null,
        };
        const vendorInfoId = (formData as any).invoiceVendorInfoId;
        if (vendorInfoId) {
          const { error: vendorErr } = await supabase
            .from('companies_vendor_information')
            .update(payload)
            .eq('id', vendorInfoId);
          if (vendorErr) throw vendorErr;
        } else {
          const { data: insertedVendor, error: vendorErr } = await supabase
            .from('companies_vendor_information')
            .insert({ company_id: vendorCompanyId, ...payload })
            .select('id')
            .single();
          if (vendorErr) throw vendorErr;
          if (insertedVendor?.id) {
            setFormData((prev: any) => ({ ...prev, invoiceVendorInfoId: insertedVendor.id }));
          }
        }
      }

      const dealCompaniesList = (formData as any).dealCompanies || [];
      await supabase.from('deal_companies').delete().eq('deal_id', dealId);
      let dealCompanyId: string | null = null;
      if (dealCompaniesList.length > 0) {
        const { data: insertedCompanies } = await supabase
          .from('deal_companies')
          .insert(
            dealCompaniesList.map((dc: { company_id: string; role: string }) => ({
              deal_id: dealId,
              company_id: dc.company_id,
              role: dc.role || 'client',
            }))
          )
          .select('id, role');
        const firstClient = (insertedCompanies || []).find((r: any) => r.role === 'client');
        dealCompanyId = firstClient?.id ?? insertedCompanies?.[0]?.id ?? null;
      }

      const dealContactsList = (formData as any).dealContacts || [];
      await supabase.from('deal_contacts').delete().eq('deal_id', dealId);
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

      // Deliverables: update rows in place, insert new ones, delete removed — keeps stable IDs for FKs (invoices, events).
      const deliverablesList = (formData.deliverables || []) as Deliverable[];
      const deliverablesToSave = deliverablesList.filter((d) => (d.name ?? '').trim() !== '');

      const { data: existingDeliverableRows, error: existingDelivErr } = await supabase
        .from('deal_deliverables')
        .select('id')
        .eq('deal_id', dealId);
      if (existingDelivErr) throw existingDelivErr;
      const existingDeliverableIdList = (existingDeliverableRows ?? []).map((r: { id: string }) => r.id);
      const existingDeliverableIds = new Set(existingDeliverableIdList);

      const oldDeliverableIdToNewId: Record<string, string> = {};

      for (const d of deliverablesToSave) {
        const rowPayload = {
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
        };

        if (d.id && existingDeliverableIds.has(d.id)) {
          const { error: upDelivErr } = await supabase
            .from('deal_deliverables')
            .update(rowPayload)
            .eq('id', d.id)
            .eq('deal_id', dealId);
          if (upDelivErr) throw upDelivErr;
        } else {
          const { data: inserted, error: insDelivErr } = await supabase
            .from('deal_deliverables')
            .insert({ deal_id: dealId, ...rowPayload })
            .select('id')
            .single();
          if (insDelivErr) throw insDelivErr;
          if (d.id && inserted?.id) {
            oldDeliverableIdToNewId[d.id] = inserted.id;
          }
        }
      }

      const deliverableIdsStillInForm = new Set(
        deliverablesToSave.map((d) => d.id).filter((id): id is string => Boolean(id))
      );
      const deliverableIdsToRemove = existingDeliverableIdList.filter(
        (id) => !deliverableIdsStillInForm.has(id)
      );
      if (deliverableIdsToRemove.length > 0) {
        const { error: delDelivErr } = await supabase
          .from('deal_deliverables')
          .delete()
          .in('id', deliverableIdsToRemove);
        if (delDelivErr) throw delDelivErr;
      }

      const persistInvoiceResult = await persistInvoiceFromFormData(
        supabase,
        formData as Record<string, unknown>,
        oldDeliverableIdToNewId,
        { syncInvoicePayments: isUserAdmin }
      );
      if (persistInvoiceResult.ok === false) {
        throw new Error(persistInvoiceResult.message);
      }

      if (formData.contractFileUrl) {
        const contractId = (formData as any)._contractId;
        const fileName = formData.contractFileName || formData.contractFileUrl?.split('/').pop() || 'contract.pdf';
        if (contractId) {
          await supabase
            .from('deal_documents')
            .update({
              file_url: formData.contractFileUrl,
              file_name: fileName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contractId);
        } else {
          await supabase.from('deal_documents').insert({
            deal_id: dealId,
            file_name: fileName,
            file_url: formData.contractFileUrl,
            mime_type: 'application/pdf',
            document_type: 'contract',
            });
        }
      }
      
      // Sync deal_documents - archive ones not in formData, insert/update ones that are
      const dealDocumentsList = (formData as any).dealDocuments || [];
      const formDataDocIds = new Set(dealDocumentsList.filter((d: any) => d.id).map((d: any) => d.id));
      
      // Get all current document IDs for this deal (excluding archived documents)
      const { data: currentDocs } = await supabase
        .from('deal_documents')
        .select('id')
        .eq('deal_id', dealId)
        .eq('is_archived', false);
      
      // Archive documents that are no longer in formData
      if (currentDocs && currentDocs.length > 0) {
        const docsToArchive = currentDocs
          .filter((doc: any) => !formDataDocIds.has(doc.id))
          .map((doc: any) => doc.id);
        
        if (docsToArchive.length > 0) {
          await supabase
            .from('deal_documents')
            .update({ is_archived: true })
            .in('id', docsToArchive);
        }
      }
      
      // Insert/update documents from formData
      if (dealDocumentsList.length > 0) {
        for (const doc of dealDocumentsList) {
          if (doc.id) {
            // Document already exists, update it if needed
            await supabase
              .from('deal_documents')
              .update({
                file_name: doc.file_name,
                file_url: doc.file_url,
                mime_type: doc.mime_type || 'application/octet-stream',
                document_type: doc.document_type || 'document',
                name: doc.name || doc.file_name,
              })
              .eq('id', doc.id);
          } else {
            // New document (shouldn't happen if upload worked, but handle it)
            await supabase.from('deal_documents').insert({
              deal_id: dealId,
              file_name: doc.file_name,
              file_url: doc.file_url,
              mime_type: doc.mime_type || 'application/octet-stream',
              document_type: doc.document_type || 'document',
              uploaded_by: user.id,
              name: doc.name || doc.file_name,
            });
          }
        }
      }

      const dealTalentList = (formData as any).dealTalent || [];
      await supabase.from('deal_talent').delete().eq('deal_id', dealId);
      if (dealTalentList.length > 0) {
        await supabase.from('deal_talent').insert(
          dealTalentList.map((t: any) => ({
            deal_id: dealId,
            talent_id: t.talent_id,
            role: t.role || null,
            revenue_share_bps: t.revenue_share_bps != null && t.revenue_share_bps !== '' ? Number(t.revenue_share_bps) : null,
          }))
        );
      }

      const dealCommissionsList = (formData as any).dealCommissions || [];
      await supabase.from('deal_commissions').delete().eq('deal_id', dealId);
      if (dealCommissionsList.length > 0) {
        await supabase.from('deal_commissions').insert(
          dealCommissionsList.map((c: any) => ({
            deal_id: dealId,
            user_id: c.user_id,
            commission_bps: Number(c.commission_bps) || 0,
            role: c.role || null,
          }))
        );
      }

      if (persistInvoiceResult.ok === true && persistInvoiceResult.skipped === false) {
        const written = persistInvoiceResult as PersistedInvoiceFromForm;
        setFormData((prev: any) => ({
          ...prev,
          invoiceLineItems: written.invoiceLineItems,
          invoiceDetails: {
            ...(prev.invoiceDetails ?? {}),
            ...written.invoiceDetails,
          },
          invoicePayments: written.invoicePayments,
        }));
        savedDataRef.current = {
          ...savedDataRef.current,
          _invoiceId: (formData as any)._invoiceId,
          invoiceDetails: written.invoiceDetails as any,
          invoiceLineItems: written.invoiceLineItems as any,
          invoicePayments: written.invoicePayments as any,
        } as typeof formData;
      }

      wallsToast.success("Deal saved", (formData.dealName ?? "").trim() || undefined);

      onClose();
      if (onSaved) onSaved();
      else router.push("/agents/crm/deals");

    } catch (error) {
      console.error("Error updating deal:", error);
      wallsToast.error("Error", "Failed to update deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyDeal = async () => {
    if (!user) {
      wallsToast.error("Error", "You must be logged in to copy a deal");
      return;
    }
    try {
      setIsCopying(true);
      const supabase = getSupabaseClient();

      const { data: newDeal, error: dealErr } = await supabase
        .from('deals')
        .insert({
          deal_name: `(COPY) ${formData.dealName || 'Untitled Deal'}`,
          source: formData.leadSource || 'inbound-agency-email',
          deal_type: formData.pipeline || null,
          deal_stage_id: (formData as any)._dealStageId || null,
          deal_owner: formData.dealOwner || user.id,
          vendor_company_id: (formData as any).invoiceVendorCompanyId ?? null,
        })
        .select('id')
        .single();
      if (dealErr || !newDeal) throw dealErr ?? new Error('Failed to create deal copy');

      const newDealId = newDeal.id;

      // Copy deal_companies and track old → new deal_company_id for contacts
      const dealCompaniesList = (formData as any).dealCompanies || [];
      let newDealCompanyId: string | null = null;
      if (dealCompaniesList.length > 0) {
        const { data: insertedCompanies } = await supabase
          .from('deal_companies')
          .insert(dealCompaniesList.map((dc: any) => ({ deal_id: newDealId, company_id: dc.company_id, role: dc.role || 'client' })))
          .select('id, role');
        const firstClient = (insertedCompanies || []).find((r: any) => r.role === 'client');
        newDealCompanyId = firstClient?.id ?? insertedCompanies?.[0]?.id ?? null;
      }

      // Copy deal_contacts
      const dealContactsList = (formData as any).dealContacts || [];
      if (dealContactsList.length > 0 && newDealCompanyId) {
        await supabase.from('deal_contacts').insert(
          dealContactsList.map((c: any) => ({
            deal_id: newDealId,
            deal_company_id: newDealCompanyId,
            person_id: c.person_id,
            role: c.role ?? null,
          }))
        );
      }

      // Copy deal_deliverables and build old → new ID map for events
      const deliverablesList = (formData.deliverables || []) as Deliverable[];
      const validDeliverables = deliverablesList.filter((d) => (d.name ?? '').trim() !== '');
      const oldDeliverableIdToNewId: Record<string, string> = {};
      for (const d of validDeliverables) {
        const { data: inserted } = await supabase
          .from('deal_deliverables')
          .insert({
            deal_id: newDealId,
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
        if (d.id && inserted?.id) {
          oldDeliverableIdToNewId[d.id] = inserted.id;
        }
      }

      // Copy deal_documents
      const dealDocumentsList = (formData as any).dealDocuments || [];
      if (dealDocumentsList.length > 0) {
        await supabase.from('deal_documents').insert(
          dealDocumentsList.map((doc: any) => ({
            deal_id: newDealId,
            file_name: doc.file_name,
            file_url: doc.file_url,
            mime_type: doc.mime_type || 'application/octet-stream',
            document_type: doc.document_type || 'document',
            name: doc.name || doc.file_name,
            uploaded_by: user.id,
          }))
        );
      }

      // Copy deal_talent
      const dealTalentList = (formData as any).dealTalent || [];
      if (dealTalentList.length > 0) {
        await supabase.from('deal_talent').insert(
          dealTalentList.map((t: any) => ({
            deal_id: newDealId,
            talent_id: t.talent_id,
            role: t.role || null,
            revenue_share_bps: t.revenue_share_bps != null && t.revenue_share_bps !== '' ? Number(t.revenue_share_bps) : null,
          }))
        );
      }

      // Copy deal_commissions
      const dealCommissionsList = (formData as any).dealCommissions || [];
      if (dealCommissionsList.length > 0) {
        await supabase.from('deal_commissions').insert(
          dealCommissionsList.map((c: any) => ({
            deal_id: newDealId,
            user_id: c.user_id,
            commission_bps: Number(c.commission_bps) || 0,
            role: c.role || null,
          }))
        );
      }

      wallsToast.success("Deal copied", `"(COPY) ${formData.dealName}" has been created`);
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error copying deal:", error);
      wallsToast.error("Error", "Failed to copy deal");
    } finally {
      setIsCopying(false);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      wallsToast.error("Error", "You must be logged in to delete a deal");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('deals').delete().eq('id', dealId);
      if (error) throw error;

      wallsToast.negative("Success", "Deal and all associated data deleted successfully");
      onClose();
      if (onSaved) onSaved();
      else router.push("/agents/crm/deals");
    } catch (error) {
      console.error("Error deleting deal:", error);
      wallsToast.error("Error", "Failed to delete deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const refreshDealData = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: deal, error } = await supabase
          .from('deals')
          .select(`
            id,
            deal_name,
            source,
            deal_type,
            deal_stage_id,
            deal_owner,
            vendor_company_id,
            deal_stages (id, name, slug, order_index, probability, is_won, is_lost),
            users!deals_deal_owner_fkey (id, first_name, last_name, avatar_url)
          `)
          .eq('id', dealId)
          .single();
        
        if (error || !deal) {
          console.error("Error refreshing deal data:", error);
          return;
        }
        
        const [companiesRes, contactsRes, deliverablesRes, documentsRes, dealTalentRes, commissionsRes] = await Promise.all([
          supabase.from('deal_companies').select('id, company_id, role, companies(id, name, website, logo_url)').eq('deal_id', dealId),
          supabase.from('deal_contacts').select('id, person_id, deal_company_id, role, people(id, first_name, last_name, email, photo_url)').eq('deal_id', dealId),
          supabase.from('deal_deliverables').select('id, name, description, quantity, unit_price_cents, currency, billing_type, billing_interval, starts_at, recurrence_count, net_payout, details').eq('deal_id', dealId),
          supabase.from('deal_documents').select('id, file_name, file_url, mime_type, document_type, name').eq('deal_id', dealId).eq('is_archived', false),
          supabase.from('deal_talent').select('id, talent_id, role, revenue_share_bps, talent(id, first_name, last_name, avatar_url, country, user_id, users(tax_region))').eq('deal_id', dealId),
          supabase.from('deal_commissions').select('id, user_id, commission_bps, role, users(id, first_name, last_name, email, avatar_url)').eq('deal_id', dealId),
        ]);

        const companiesList = (companiesRes.data || []).map((dc: any) => {
          const c = dc.companies ? (Array.isArray(dc.companies) ? dc.companies[0] : dc.companies) : null;
          return {
            id: dc.id,
            company_id: dc.company_id,
            company_name: c?.name ?? '',
            role: dc.role ?? 'client',
            logo_url: c?.logo_url ?? null,
          };
        });
        const companyRow = (companiesRes.data || []).find((dc: any) => dc.role === 'client') || companiesRes.data?.[0];
        const company = companyRow?.companies ? (Array.isArray(companyRow.companies) ? companyRow.companies[0] : companyRow.companies) : null;
        const stage = Array.isArray(deal.deal_stages) ? deal.deal_stages[0] : deal.deal_stages;
        const owner = Array.isArray(deal.users) ? deal.users[0] : deal.users;

        const dealTalentList = (dealTalentRes.data || []).map((dt: any) => {
          const t = Array.isArray(dt.talent) ? dt.talent[0] : dt.talent;
          const u = t?.users ? (Array.isArray(t.users) ? t.users[0] : t.users) : null;
          const name = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : '';
              return {
            id: dt.id,
            talent_id: dt.talent_id,
            talent_name: name,
            avatar_url: t?.avatar_url || undefined,
            role: dt.role ?? null,
            revenue_share_bps: dt.revenue_share_bps ?? null,
            talent_country: t?.country ?? null,
            talent_tax_region: u?.tax_region ?? null,
              };
            });
        const firstTalent = dealTalentList[0];
        const creatorFromTalent = firstTalent?.talent_name || '';
        const creatorPictureFromTalent = firstTalent?.avatar_url || '';

        const dealCommissionsList = (commissionsRes.data || []).map((dc: any) => {
          const u = Array.isArray(dc.users) ? dc.users[0] : dc.users;
          return {
            id: dc.id,
            user_id: dc.user_id,
            first_name: u?.first_name ?? '',
            last_name: u?.last_name ?? '',
            email: u?.email ?? null,
            avatar_url: u?.avatar_url ?? null,
            commission_bps: dc.commission_bps ?? 0,
            role: dc.role ?? null,
          };
        });

        const deliverablesList: Deliverable[] = (deliverablesRes.data || []).map((d: any): Deliverable => ({
          id: d.id,
          name: d.name || '',
          description: d.description ?? null,
          quantity: Number(d.quantity) || 1,
          unit_price_cents: Number(d.unit_price_cents) || 0,
          currency: d.currency || 'USD',
          billing_type: d.billing_type === 'recurring' ? 'recurring' : d.billing_type === 'time_based' ? 'time_based' : 'one_off',
          billing_interval: d.billing_type === 'recurring' ? (d.billing_interval ?? 'monthly') : null,
          starts_at: d.starts_at ?? null,
          recurrence_count: d.recurrence_count ?? null,
          net_payout: d.net_payout ?? null,
          detailsEntries: d.details
            ? (Object.entries(d.details as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]) as [string, string][])
            : [],
        }));
        const _dealDeliverables = (deliverablesRes.data || []).map((d: any) => ({ id: d.id, name: d.name || '' }));
        const amount = (deliverablesRes.data || []).reduce(
          (sum: number, d: any) => sum + (Number(d.quantity) || 0) * (Number(d.unit_price_cents) || 0) / 100,
          0
        );

        const dealContactsList = (contactsRes.data || []).map((dc: any) => {
          const p = Array.isArray(dc.people) ? dc.people[0] : dc.people;
          return {
            id: dc.id,
            person_id: dc.person_id,
            first_name: p?.first_name ?? '',
            last_name: p?.last_name ?? '',
            email: p?.email ?? null,
            role: dc.role ?? null,
            photo_url: p?.photo_url ?? null,
          };
        });
        const firstContact = dealContactsList[0];
        const pointOfContact = firstContact ? `${firstContact.first_name || ''} ${firstContact.last_name || ''}`.trim() : '';

        const allDocs = (documentsRes.data || []) as { id: string; file_name: string; file_url: string; mime_type?: string; document_type?: string; name?: string | null }[];
        const contractDoc = allDocs.find((d) => d.document_type === 'contract');
        const contractFileUrl = contractDoc?.file_url || '';
        const contractFileName = contractDoc?.file_name || '';
        // Include all documents regardless of document_type
        const dealDocumentsList = allDocs.map((d) => ({
            id: d.id,
            file_name: d.file_name,
            file_url: d.file_url,
            mime_type: d.mime_type || 'application/octet-stream',
            document_type: d.document_type || 'document',
            name: d.name || null,
          }));

        const stageOrder = stage?.order_index ?? null;
        let nextStep = '';
        if (stageOrder !== null) {
          const { data: allStages } = await supabase.from('deal_stages').select('id, name, order_index, is_won, is_lost').order('order_index', { ascending: true });
          const list = (allStages || []) as { order_index?: number; name: string; is_won?: boolean; is_lost?: boolean }[];
          const next = list.find((s) => (s.order_index ?? 999) > stageOrder && !s.is_won && !s.is_lost);
          const stageAny = stage as { is_won?: boolean; is_lost?: boolean } | null;
          nextStep = next ? next.name : (stageAny?.is_won || stageAny?.is_lost ? 'Complete' : '');
        }

        const vendorCompanyIdRefresh = (deal as any).vendor_company_id as string | null | undefined;
        let invoiceVendorInfoRefresh = { ...emptyVendorInfo };
        let invoiceVendorInfoIdRefresh: string | null = null;
        if (vendorCompanyIdRefresh) {
          const { data: vinf } = await supabase
            .from('companies_vendor_information')
            .select('id, legal_name, city, state, country, address, post_code, vendor_email')
            .eq('company_id', vendorCompanyIdRefresh)
            .maybeSingle();
          if (vinf) {
            invoiceVendorInfoIdRefresh = vinf.id;
            invoiceVendorInfoRefresh = {
              legal_name: vinf.legal_name ?? '',
              city: vinf.city ?? '',
              state: vinf.state ?? '',
              country: vinf.country ?? '',
              address: vinf.address ?? '',
              post_code: vinf.post_code ?? '',
              vendor_email: vinf.vendor_email ?? '',
            };
          }
        }

        const refreshedData = {
          creator: creatorFromTalent || (owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() : ''),
          company: company?.name || '',
          dealName: deal.deal_name || '',
          amount: amount.toString(),
          payoutNet: '',
          leadSource: deal.source || '',
          deliverables: deliverablesList,
          dealTalent: dealTalentList,
          _dealDeliverables,
          submissionDueDate: '',
          liveDueDate: '',
          stage: stage?.name || '',
          pointOfContact,
          dealContacts: dealContactsList,
          ideationDueDate: '',
          split: '',
          dealOwner: deal.deal_owner || '',
          dealOwnerName: owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() : '',
          dealOwnerAvatar: owner?.avatar_url || '',
          expectedNet: '',
          nextStep,
          expectedRevenue: '',
          payoutDate: '',
          probability: stage?.probability?.toString() || '',
          conceptSubmissionDate: '',
          pipeline: deal.deal_type || '',
          companyWebsite: company?.website || '',
          creatorProfilePicture: creatorPictureFromTalent || owner?.avatar_url || '',
          contractFileName,
          contractFileUrl,
          contractFile: formData.contractFile,
          dealDocuments: dealDocumentsList,
          _dealId: deal.id,
          dealId: deal.id,
          dealCompanies: companiesList,
          dealCommissions: dealCommissionsList,
          _companyId: company?.id || (companyRow as any)?.company_id || null,
          _dealCompanyId: (companyRow as any)?.id || null,
          _dealStageId: deal.deal_stage_id,
          _stageId: deal.deal_stage_id,
          _partnershipStageId: deal.deal_stage_id,
          _contractId: contractDoc?.id || null,
          _stageIndexOrder: stageOrder,
          invoiceVendorCompanyId: vendorCompanyIdRefresh ?? null,
          invoiceVendorInfo: invoiceVendorInfoRefresh,
          invoiceVendorInfoId: invoiceVendorInfoIdRefresh,
        };
        setFormData((prev) => ({ ...prev, ...refreshedData } as typeof formData));
        savedDataRef.current = { ...savedDataRef.current, ...refreshedData };
      } catch (error) {
        console.error("Error refreshing deal data:", error);
      }
    };

    refreshDealData();
    const refreshInterval = setInterval(() => {
      if (!hasChangesRef.current) refreshDealData();
    }, 30000);
    return () => clearInterval(refreshInterval);
  }, [dealId, formData.contractFile]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        wallsToast.success("Copied!", "Campaign ID copied to clipboard");
      })
      .catch((err) => {
        wallsToast.error("Error", "Failed to copy Campaign ID to clipboard");
        console.error('Failed to copy text: ', err);
      });
  };

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

  const handleCloseClick = (e: React.MouseEvent) => {
    if (isHoldingComplete) return; // do nothing if hold succeeded
    setShowDeleteButton(false);
    onClose();
  };

  // Check for changes in form data
  useEffect(() => {
    // Skip comparison on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setHasChanges(false);
      return;
    }

    // Normalize deliverables for comparison (use same parsing logic)
    const normalizeDeliverables = (deliverables: any): Deliverable[] => {
      if (!deliverables) return [];
      if (Array.isArray(deliverables)) return deliverables;
      try {
        return JSON.parse(deliverables);
      } catch {
        return [];
      }
    };

    const normalizedInitialDeliverables = normalizeDeliverables(savedDataRef.current.deliverables);
    const normalizedCurrentDeliverables = normalizeDeliverables(formData.deliverables);

    // List of all editable fields across all tabs
    const editableFields: (keyof typeof formData)[] = [
      'dealName',
      'creator',
      'company',
      'amount',
      'payoutNet',
      'leadSource',
      'submissionDueDate',
      'liveDueDate',
      'stage',
      'ideationDueDate',
      'split',
      'dealOwner',
      'expectedNet',
      'nextStep',
      'expectedRevenue',
      'payoutDate',
      'probability',
      'conceptSubmissionDate',
      'pipeline',
      'contractFileName',
      'contractFileUrl',
    ];

    // Check simple string/number fields
    const hasSimpleFieldChanges = editableFields.some(field => {
      const currentValue = formData[field];
      const initialValue = savedDataRef.current[field];

      // Handle null, undefined, empty strings - treat them all as empty
      const normalizedCurrent = currentValue == null ? '' : String(currentValue).trim();
      const normalizedInitial = initialValue == null ? '' : String(initialValue).trim();

      return normalizedCurrent !== normalizedInitial;
    });

    // Check deliverables array (deep comparison)
    const hasDeliverablesChanges = (() => {
      if (normalizedCurrentDeliverables.length !== normalizedInitialDeliverables.length) {
        return true;
      }
      return normalizedCurrentDeliverables.some((d: Deliverable, index: number) => {
        const a = normalizedInitialDeliverables[index];
        if (!a) return true;
        const nameCur = (d.name ?? d.type ?? '').trim();
        const nameInit = (a.name ?? a.type ?? '').trim();
        return nameCur !== nameInit ||
          (d.description ?? '') !== (a.description ?? '') ||
          (d.quantity ?? 0) !== (a.quantity ?? 0) ||
          (d.unit_price_cents ?? (d.price_per != null ? Math.round(d.price_per * 100) : 0)) !== (a.unit_price_cents ?? (a.price_per != null ? Math.round(a.price_per * 100) : 0)) ||
          (d.currency ?? 'USD') !== (a.currency ?? 'USD') ||
          (d.billing_type ?? 'one_off') !== (a.billing_type ?? 'one_off') ||
          (d.billing_interval ?? '') !== (a.billing_interval ?? '') ||
          (d.starts_at ?? '') !== (a.starts_at ?? '') ||
          (d.recurrence_count ?? null) !== (a.recurrence_count ?? null);
      });
    })();

    // Check deal talent array for changes
    const hasDealTalentChanges = (() => {
      const current = (formData as any).dealTalent || [];
      const initial = (savedDataRef.current as any).dealTalent || [];
      if (current.length !== initial.length) return true;
      return current.some((t: any, i: number) => {
        const a = initial[i];
        if (!a) return true;
        return (t.talent_id || '') !== (a.talent_id || '') ||
          (t.talent_name || '') !== (a.talent_name || '') ||
          (t.role ?? '') !== (a.role ?? '') ||
          (t.revenue_share_bps ?? '') !== (a.revenue_share_bps ?? '');
      });
    })();

    const hasContractFileChanges = (formData.contractFileName || '') !== (savedDataRef.current.contractFileName || '') ||
                                   (formData.contractFileUrl || '') !== (savedDataRef.current.contractFileUrl || '');

    const hasDealDocumentsChanges = (() => {
      const current = (formData as any).dealDocuments || [];
      const initial = (savedDataRef.current as any).dealDocuments || [];
      if (current.length !== initial.length) return true;
      return current.some((d: any, i: number) => {
        const a = initial[i];
        if (!a) return true;
        return (d.file_name || '') !== (a.file_name || '') ||
          (d.file_url || '') !== (a.file_url || '') ||
          (d.document_type ?? '') !== (a.document_type ?? '');
      });
    })();

    const hasDealContactsChanges = (() => {
      const current = (formData as any).dealContacts || [];
      const initial = (savedDataRef.current as any).dealContacts || [];
      if (current.length !== initial.length) return true;
      return current.some((c: any, i: number) => {
        const a = initial[i];
        if (!a) return true;
        return (c.person_id || '') !== (a.person_id || '') ||
          (c.role ?? '') !== (a.role ?? '');
      });
    })();

    const hasDealCompaniesChanges = (() => {
      const current = (formData as any).dealCompanies || [];
      const initial = (savedDataRef.current as any).dealCompanies ?? [];
      if (current.length !== initial.length) return true;
      return current.some((dc: any, i: number) => {
        const a = initial[i];
        if (!a) return true;
        return (dc.company_id || '') !== (a.company_id || '') || (dc.role || '') !== (a.role || '');
      });
    })();

    const hasDealCommissionsChanges = (() => {
      const current = (formData as any).dealCommissions || [];
      const initial = (savedDataRef.current as any).dealCommissions ?? [];
      if (current.length !== initial.length) return true;
      return current.some((c: any, i: number) => {
        const a = initial[i];
        if (!a) return true;
        const curBps = Number(c.commission_bps) || 0;
        const initBps = Number(a.commission_bps) || 0;
        return (c.user_id || '') !== (a.user_id || '') ||
          curBps !== initBps ||
          (c.role ?? '') !== (a.role ?? '');
      });
    })();

    const normalizeVendorInfo = (v: any) => {
      const b = { ...emptyVendorInfo, ...(v ?? {}) };
      return {
        legal_name: String(b.legal_name ?? '').trim(),
        vendor_email: String(b.vendor_email ?? '').trim(),
        address: String(b.address ?? '').trim(),
        city: String(b.city ?? '').trim(),
        state: String(b.state ?? '').trim(),
        post_code: String(b.post_code ?? '').trim(),
        country: String(b.country ?? '').trim(),
      };
    };
    const hasVendorInvoicingChanges = (() => {
      const curCompany = (formData as any).invoiceVendorCompanyId ?? null;
      const savCompany = (savedDataRef.current as any).invoiceVendorCompanyId ?? null;
      if (curCompany !== savCompany) return true;
      const curVi = normalizeVendorInfo((formData as any).invoiceVendorInfo);
      const savVi = normalizeVendorInfo((savedDataRef.current as any).invoiceVendorInfo);
      if (
        curVi.legal_name !== savVi.legal_name ||
        curVi.vendor_email !== savVi.vendor_email ||
        curVi.address !== savVi.address ||
        curVi.city !== savVi.city ||
        curVi.state !== savVi.state ||
        curVi.post_code !== savVi.post_code ||
        curVi.country !== savVi.country
      ) {
        return true;
      }
      const curId = (formData as any).invoiceVendorInfoId ?? null;
      const savId = (savedDataRef.current as any).invoiceVendorInfoId ?? null;
      return curId !== savId;
    })();

    const hasInvoiceDraftChanges = hasInvoiceDraftChanged(
      formData as unknown as Record<string, unknown>,
      savedDataRef.current as unknown as Record<string, unknown>
    );

    const next =
      hasSimpleFieldChanges ||
      hasDeliverablesChanges ||
      hasDealTalentChanges ||
      hasContractFileChanges ||
      hasDealDocumentsChanges ||
      hasDealContactsChanges ||
      hasDealCompaniesChanges ||
      hasDealCommissionsChanges ||
      hasVendorInvoicingChanges ||
      hasInvoiceDraftChanges;
    hasChangesRef.current = next;
    setHasChanges(next);
  }, [formData]);

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
  }, [isSubmitting, router]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className={cn(
          "overflow-y-auto overflow-x-hidden overscroll-contain p-0 [&>button]:hidden shadow-2xl rounded-none",
          DEAL_VIEW_SHEET_PANEL_SURFACE,
          isMaximized ? "w-full" : "w-3/4",
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
                <div
                  className={cn(
                    "relative h-[70px] flex items-center flex-shrink-0",
                    isPartnershipDeal ? "w-[100px]" : "w-[70px]"
                  )}
                >
                  <Image
                    src={companyLogo || "/images/og-image.png"}
                    alt={`${formData.company} Logo`}
                    width={70}
                    height={70}
                    className="absolute left-0 top-0 w-[70px] h-[70px] rounded-full z-10 bg-gray-50 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/og-image.png";
                    }}
                  />
                  {isPartnershipDeal && (
                    <Image
                      src={creatorProfilePicture || "/images/og-image.png"}
                      alt={`${formData.creator} Profile`}
                      width={70}
                      height={70}
                      className="absolute left-10 top-0 w-[70px] h-[70px] rounded-full bg-gray-50 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/og-image.png";
                      }}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <h1
                      className="text-5xl font-black text-foreground leading-tight mt-1 min-w-0 truncate"
                      title={formData.dealName || "Deal Name"}
                    >
                      {formData.dealName || "Deal Name"}
                    </h1>
                    <div className="flex-1 min-w-8 shrink border-t border-black h-[1px]" />
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCopyDeal}
                        disabled={isSubmitting || isCopying}
                        className={dealSheetHeaderIconButtonClass}
                      >
                        <div className="relative">
                          <div className={dealSheetHeaderIconInnerClass}>
                            {isCopying ? (
                              <Loader2 className="h-[18px] w-[18px] stroke-[1.5] text-neutral-600 animate-spin" />
                            ) : (
                              <Copy className="h-[18px] w-[18px] stroke-[1.5] text-neutral-600" />
                            )}
                          </div>
                        </div>
                      </Button>
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
                            onClick={async () => {
                              setShowDeleteButton(false);
                              setIsHoldingComplete(false);
                              await handleDelete();
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

                      {hasChanges && (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs underneath header */}
            <div className="flex space-x-1 items-center -ml-2 mt-8">
                {tabs.map((tab) => (
                  <Button 
                    key={tab.id}
                    variant="ghost"
                    className={cn(
                      "relative px-4 py-2 group hover:bg-transparent font-light",
                      activeTab === tab.id 
                        ? "text-neutral-700" 
                        : "text-neutral-700 hover:text-neutral-700"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.name}
                    <div className={cn(
                      "absolute bottom-0 left-0 h-0.5 bg-neutral-700 transition-all duration-300",
                      activeTab === tab.id ? "w-4/5 mx-auto right-0" : "w-0 group-hover:w-4/5 group-hover:mx-auto group-hover:right-0"
                    )} />
                  </Button>
                ))}
              </div>

            <div className="space-y-8 relative z-[2]">
              <div className="mt-6">
                {activeTab === 'basic' && (
                  <BasicInformation 
                    formData={formData}
                    setFormData={setFormData}
                    dealId={dealId}
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

                {activeTab === 'conversations' && (
                  <Conversations dealId={dealId} />
                )}

                {activeTab === 'invoicing' && (
                  <Invoicing
                    formData={formData}
                    setFormData={setFormData}
                    dealId={dealId}
                    onInvoiceDraftSynced={syncInvoiceDraftToSaved}
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
                    dealId={dealId}
                  />
                )}

                {activeTab === 'contract' && (
                  <Contract
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

                {activeTab === 'time-entries' && (
                  <TimeEntries dealId={dealId} />
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