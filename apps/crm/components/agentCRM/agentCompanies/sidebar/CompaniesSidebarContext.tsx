import React, { createContext, useContext, useState } from 'react';

interface CompaniesSidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const CompaniesSidebarContext = createContext<CompaniesSidebarContextType | undefined>(undefined);

export function CompaniesSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <CompaniesSidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </CompaniesSidebarContext.Provider>
  );
}

export function useCompaniesSidebar() {
  const context = useContext(CompaniesSidebarContext);
  if (context === undefined) {
    throw new Error('useCompaniesSidebar must be used within a CompaniesSidebarProvider');
  }
  return context;
} 