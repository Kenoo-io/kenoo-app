import { createContext, useContext, useState, ReactNode } from 'react';

export interface CompaniesSearchSidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  filters: {
    industry: string;
    companyName: string;
    companySize: string[];
    revenueMin: string;
    revenueMax: string;
    location: string;
    website: string;
  };
  setFilters: (filters: CompaniesSearchSidebarContextType['filters']) => void;
}

const CompaniesSearchSidebarContext = createContext<CompaniesSearchSidebarContextType | undefined>(undefined);

export function CompaniesSearchSidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [filters, setFilters] = useState<CompaniesSearchSidebarContextType['filters']>({
    industry: '',
    companyName: '',
    companySize: [],
    revenueMin: '',
    revenueMax: '',
    location: '',
    website: ''
  });

  return (
    <CompaniesSearchSidebarContext.Provider value={{ isCollapsed, setIsCollapsed, filters, setFilters }}>
      {children}
    </CompaniesSearchSidebarContext.Provider>
  );
}

export function useCompaniesSearchSidebar() {
  const context = useContext(CompaniesSearchSidebarContext);
  if (context === undefined) {
    throw new Error('useCompaniesSearchSidebar must be used within a CompaniesSearchSidebarProvider');
  }
  return context;
} 