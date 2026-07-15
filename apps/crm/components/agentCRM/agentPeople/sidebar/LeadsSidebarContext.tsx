import React, { createContext, useContext, useState } from 'react';

interface LeadsSidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const LeadsSidebarContext = createContext<LeadsSidebarContextType | undefined>(undefined);

export function LeadsSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <LeadsSidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </LeadsSidebarContext.Provider>
  );
}

export function useLeadsSidebar() {
  const context = useContext(LeadsSidebarContext);
  if (context === undefined) {
    throw new Error('useLeadsSidebar must be used within a LeadsSidebarProvider');
  }
  return context;
} 