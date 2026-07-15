export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  domain: string;
  phone: string;
  employeeCount: number | null;
  annualRevenue: number | null;
  country: string;
  city: string;
  foundingYear: number | null;
  createdAt: string | null;
  logoUrl: string | null;
  lastEnriched?: string | null;
  tags?: Array<{ tag: string; type: string }>;
}

export interface Filters {
  industry: string;
  status: string;
  country: string;
  employeeCount: string;
  revenueRange: string;
  searchTerm: string;
}

export interface ImageStates {
  [companyId: string]: {
    logoFailed: boolean;
  };
}

export interface SequencePopupCompanyData {
  company?: string;
  email?: string;
}

