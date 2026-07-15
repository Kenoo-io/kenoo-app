"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import BasicInformation from "../tabs/general";
import VendorInformation from "../tabs/vendor-information";
import Architecture from "../tabs/architecture";
import {
  BARE_DOMAIN_ERROR,
  bareDomainToWebsite,
  normalizeBareDomain,
} from "../lib/domain-utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
import { Toaster } from "@/components/ui/toaster";
import { Loader2, Save, X, Expand, Minimize } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet-view";
import { cn } from "@/lib/utils";
import { syncCompanySocialUrls } from "@/lib/company-social";


interface CreateAgentCompaniesProps {
  analyticsData: any;
  /** Called after a company is successfully created. Use to refresh the companies list when embedded (e.g. in a sheet). */
  onSuccess?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface CompanyFormData {
  name: string;
  industry: string;
  website: string;
  domain: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  employeeCount: string;
  annualRevenue: string;
  linkedinUrl: string;
  status: string;
  notes: string;
  primaryContact: string;
  lastInteraction: string;
  foundingYear: string;
  companyOverview: string;
  keywords: string[];
  vendorCompanyName: string;
  vendorCity: string;
  vendorState: string;
  vendorCountry: string;
  vendorZipCode: string;
  vendorPointOfContact: string;
  parentCompany: string;
  clientele: string[];
}

const initialFormData: CompanyFormData = {
  name: "",
  industry: "",
  website: "",
  domain: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  employeeCount: "",
  annualRevenue: "",
  linkedinUrl: "",
  status: "Prospect",
  notes: "",
  primaryContact: "",
  lastInteraction: new Date().toISOString().split('T')[0],
  foundingYear: "",
  companyOverview: "",
  keywords: [],
  vendorCompanyName: "",
  vendorCity: "",
  vendorState: "",
  vendorCountry: "",
  vendorZipCode: "",
  vendorPointOfContact: "",
  parentCompany: "",
  clientele: [],
};

const companySheetHeaderIconButtonClass =
  "w-10 h-10 p-0 text-slate-600 hover:bg-transparent active:bg-transparent focus-visible:bg-transparent flex items-center justify-center shadow-none relative group flex-shrink-0 disabled:opacity-50";
const companySheetHeaderIconInnerClass = cn(
  "relative z-10 p-3 rounded-full transition-all duration-300 ease-in-out",
  "group-hover:bg-gray-100 group-hover:border group-hover:border-neutral-200 group-hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)] group-hover:scale-95",
);

const getInputClassName = (value: any) => {
  const hasValue = value && (
    (typeof value === 'string' && value.trim() !== '') ||
    (Array.isArray(value) && value.length > 0)
  );
  return `bg-background text-foreground ${hasValue ? 'border-green-500 focus-visible:ring-green-500' : ''}`;
};

const formatWebsiteUrl = (url: string): string | null => {
  try {
    // Remove any whitespace
    let formattedUrl = url.trim();
    
    // Replace https with http
    formattedUrl = formattedUrl.replace(/^https:\/\//i, 'http://');
    
    // Add http:// if no protocol is present
    if (!formattedUrl.startsWith('http://')) {
      formattedUrl = 'http://' + formattedUrl.replace(/^\/\//, '');
    }
    
    // Create URL object to parse the domain
    const urlObj = new URL(formattedUrl);
    
    // Return just the origin with a trailing slash
    return urlObj.origin + '/';
  } catch (error) {
    // If URL is invalid, return null
    return null;
  }
};

export default function CreateAgentCompanies({ analyticsData, onSuccess, isOpen, onClose }: CreateAgentCompaniesProps) {
  const { user } = useAuth();
  console.log("Current user state:", user);
  const router = useRouter();
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const [isMaximized, setIsMaximized] = useState(true);
  const tabs = [
    { id: "basic", name: "General" },
    { id: "architecture", name: "Architecture" },
    { id: "vendor", name: "Vendor Information" },
  ];

  const handleInputChange = (field: keyof CompanyFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSelectChange = (field: keyof CompanyFormData) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === "none" ? "" : value
    }));
  };

  const checkDuplicateWebsite = async (website: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('website', website)
        .limit(1);
      
      if (error) {
        console.error("Error checking duplicate website:", error);
        return false;
      }
      
      return (data && data.length > 0);
    } catch (error) {
      console.error("Error checking duplicate website:", error);
      return false;
    }
  };

  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, website: e.target.value }));
    setWebsiteError(""); // Clear any existing error when user types
  };

  const handleSave = async (createNew: boolean = false) => {
    console.log("Starting save process");
    if (!user) {
      console.log("No user found:", user);
      wallsToast.error("Error", "You must be logged in to create a company");
      return;
    }

    // Format and validate website URL when no domain is provided
    let formattedWebsite = formData.website ? formatWebsiteUrl(formData.website) : null;
    if (formData.website && !formattedWebsite) {
      setWebsiteError("Please enter a valid website URL");
      return;
    }

    let domain: string | null = null;
    if (formData.domain?.trim()) {
      domain = normalizeBareDomain(formData.domain.trim());
      if (!domain) {
        wallsToast.error("Invalid domain", BARE_DOMAIN_ERROR);
        return;
      }
      formattedWebsite = bareDomainToWebsite(domain);
    }

    // Check for duplicate website
    if (formattedWebsite) {
      const isDuplicate = await checkDuplicateWebsite(formattedWebsite);
      if (isDuplicate) {
        setWebsiteError("Company already exists");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      console.log("User authenticated:", user.id);

      // Fall back to website hostname when domain was not entered manually
      if (!domain && formattedWebsite) {
        try {
          const url = new URL(formattedWebsite);
          domain = url.hostname.replace(/^www\./, '');
        } catch (e) {
          console.error("Error parsing domain:", e);
        }
      }

      // Map form data to Supabase schema
      const companyData: any = {
        name: formData.name || null,
        website: formattedWebsite || null,
        domain: domain,
        annual_revenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : null,
        employee_count: formData.employeeCount ? parseInt(formData.employeeCount) : null,
        industry: formData.industry || null,
        founding_year: formData.foundingYear ? parseInt(formData.foundingYear) : null,
        country: formData.country || null,
        phone: formData.phone || null,
        city: formData.city || null,
        postal_code: formData.zipCode || null,
        address: formData.addressLine1 || null,
        street_address: formData.addressLine1 || null,
      };

      // Insert company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (companyError) {
        throw companyError;
      }

      console.log("Company created with ID:", company.id);

      // Create domain entry if website exists
      if (domain && company.id) {
        await supabase
          .from('companies_domains')
          .insert({
            company_id: company.id,
            domain: domain,
            is_primary: true,
            url: formattedWebsite,
          });
      }

      if (formData.linkedinUrl && company.id) {
        try {
          await syncCompanySocialUrls(supabase, company.id, formData.name || "Unknown", {
            linkedin: formData.linkedinUrl,
          });
        } catch (error) {
          console.error("Error processing LinkedIn URL:", error);
        }
      }

      wallsToast.success("Success", "Company created successfully");

      if (createNew) {
        setFormData(initialFormData);
      } else {
        onSuccess?.();
        if (onClose) {
          onClose();
        } else {
          router.push("/agents/crm/companies");
        }
      }
    } catch (error) {
      console.error("Detailed error saving company data:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      
      wallsToast.error("Error", "Failed to save company. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeywordsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.currentTarget.value.trim();
      if (value) {
        setFormData(prev => ({
          ...prev,
          keywords: [...prev.keywords, value]
        }));
        e.currentTarget.value = '';
      }
    }
  };

  const handleTabInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const mappedField =
      field === "organization_name" ? "name" :
      field === "shortDescription" ? "companyOverview" :
      field === "vendorContact" ? "vendorPointOfContact" :
      field === "vendorStreetAddress" ? "addressLine1" :
      field;
    setFormData((prev) => ({ ...prev, [mappedField]: e.target.value } as CompanyFormData));
  };

  const handleContactChange = (value: string) => {
    setFormData((prev) => ({ ...prev, vendorPointOfContact: value }));
  };

  const handleBooleanChange = (_field: string) => (value: boolean) => {
    setFormData((prev) => ({ ...prev, is_representative: value } as CompanyFormData));
  };

  const handleResearchCompany = async () => {
    if (!formData.name || !formData.website) return;
    
    try {
      const response = await fetch('/api/research/company-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.name,
          website: formData.website,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        result += new TextDecoder().decode(value);
      }

      const data = JSON.parse(result);
      
      if (data.companyOverview) {
        setFormData(prev => ({
          ...prev,
          companyOverview: data.companyOverview,
        }));
        
        wallsToast.success("Success", "Company overview generated successfully");
      }
    } catch (error) {
      console.error('Error researching company:', error);
      wallsToast.error("Error", "Failed to generate company overview");
    }
  };

  const tabFormData = {
    ...formData,
    organization_name: formData.name,
    shortDescription: formData.companyOverview,
    vendorContact: formData.vendorPointOfContact,
    vendorStreetAddress: formData.addressLine1,
    createdBy: user?.id || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    id: "—",
    apolloOrganizationId: "",
    apolloAccountId: "",
    apollo_organization_name: "",
    lastEnriched: null,
    is_representative: (formData as any).is_representative ?? false,
    funding_events: (formData as any).funding_events ?? [],
    suborganizations: (formData as any).suborganizations ?? [],
    current_technologies: (formData as any).current_technologies ?? [],
  };

  const content = (
    <div
      className="flex flex-col min-h-screen bg-gray-50"
    >
      <div className="flex-1 w-full px-6 pt-6 pb-8">
        <div className="mb-4 flex items-center justify-between relative z-[2]">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-4 min-w-0">
                <h1
                  className="text-5xl font-black text-foreground leading-tight mt-1 min-w-0 truncate"
                  title={formData.name || "New Company"}
                >
                  {formData.name || "New Company"}
                </h1>
                <div className="flex-1 min-w-8 shrink border-t border-black h-[1px]" />
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsMaximized(!isMaximized)}
                    disabled={isSubmitting}
                    className={companySheetHeaderIconButtonClass}
                  >
                    <div className="relative">
                      <div className={companySheetHeaderIconInnerClass}>
                        {isMaximized ? (
                          <Minimize className="h-[18px] w-[18px] stroke-[1.5] text-neutral-600" />
                        ) : (
                          <Expand className="h-[18px] w-[18px] stroke-[1.5] text-neutral-600" />
                        )}
                      </div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (onClose) onClose();
                      else router.push("/agents/crm/companies");
                    }}
                    className={companySheetHeaderIconButtonClass}
                  >
                    <div className="relative">
                      <div className={companySheetHeaderIconInnerClass}>
                        <X className="h-[18px] w-[18px] stroke-[1.5] text-neutral-600" />
                      </div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleSave(false)}
                    disabled={isSubmitting}
                    className={companySheetHeaderIconButtonClass}
                  >
                    <div className="relative">
                      <div className={companySheetHeaderIconInnerClass}>
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

        <div className="flex space-x-1 items-center -ml-2 mt-8">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              className={cn(
                "relative px-4 py-2 group hover:bg-transparent font-light",
                activeTab === tab.id ? "text-neutral-700" : "text-neutral-700 hover:text-neutral-700"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
              <div
                className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-neutral-700 transition-all duration-300",
                  activeTab === tab.id ? "w-4/5 mx-auto right-0" : "w-0 group-hover:w-4/5 group-hover:mx-auto group-hover:right-0"
                )}
              />
            </Button>
          ))}
        </div>

        <div className="space-y-8 relative z-[2]">
          <div className="mt-6">
            {activeTab === "basic" && (
              <BasicInformation
                formData={tabFormData}
                handleInputChange={handleTabInputChange}
                handleSelectChange={handleSelectChange as any}
              />
            )}
            {activeTab === "architecture" && (
              <Architecture
                formData={tabFormData}
                handleInputChange={handleTabInputChange}
                handleBooleanChange={handleBooleanChange}
              />
            )}
            {activeTab === "vendor" && (
              <VendorInformation
                formData={tabFormData}
                handleInputChange={handleTabInputChange as any}
                handleContactChange={handleContactChange}
              />
            )}
          </div>
        </div>
        {websiteError && <p className="text-red-500 text-sm mt-4">{websiteError}</p>}
        <Toaster />
      </div>
    </div>
  );

  if (typeof isOpen === "boolean") {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent
          side="right"
          className={cn(
            "overflow-y-auto overflow-x-hidden overscroll-contain p-0 [&>button]:hidden shadow-2xl rounded-none bg-gray-50 border border-neutral-200/80",
            isMaximized ? "w-full" : "w-3/4"
          )}
          style={{ transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return content;
} 