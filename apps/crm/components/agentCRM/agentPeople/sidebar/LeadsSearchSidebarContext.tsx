import React, { createContext, useContext, useState } from 'react';

interface LeadsFilters {
  personTitles: string[];
  includeSimilarTitles: boolean;
  personLocations: string[];
  personSeniorities: string[];
  organizationLocations: string[];
  organizationDomains: string[];
  contactEmailStatus: string[];
  organizationIds: string[];
  organizationNumEmployeesRanges: string[];
  keywords: string;
  page: number;
  perPage: number;
}

interface LeadsSearchSidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  filters: LeadsFilters;
  setFilters: (filters: LeadsFilters) => void;
}

const defaultFilters: LeadsFilters = {
  personTitles: [],
  includeSimilarTitles: true,
  personLocations: [],
  personSeniorities: [],
  organizationLocations: [],
  organizationDomains: [],
  contactEmailStatus: [],
  organizationIds: [],
  organizationNumEmployeesRanges: [],
  keywords: '',
  page: 1,
  perPage: 100
};

const LeadsSearchSidebarContext = createContext<LeadsSearchSidebarContextType | undefined>(undefined);

export function LeadsSearchSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [filters, setFilters] = useState<LeadsFilters>(defaultFilters);

  return (
    <LeadsSearchSidebarContext.Provider value={{ isCollapsed, setIsCollapsed, filters, setFilters }}>
      {children}
    </LeadsSearchSidebarContext.Provider>
  );
}

export function useLeadsSearchSidebar() {
  const context = useContext(LeadsSearchSidebarContext);
  if (context === undefined) {
    throw new Error('useLeadsSearchSidebar must be used within a LeadsSearchSidebarProvider');
  }
  return context;
} 