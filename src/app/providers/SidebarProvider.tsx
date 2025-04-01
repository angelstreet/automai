'use client';

import { createContext, useContext, useMemo } from 'react';
import { SidebarContext as SidebarContextType } from '@/types/sidebar';
import { useSidebar } from '@/hooks/sidebar';

// Create context with a null default value
export const SidebarContext = createContext<SidebarContextType | null>(null);

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  initialState?: SidebarContextType;
}

export function SidebarProvider({ 
  children, 
  defaultOpen = true,
  initialState
}: SidebarProviderProps) {
  console.log(`[@context:SidebarContext:SidebarProvider] Initializing provider`);

  // Use the hook for all business logic
  const sidebarLogic = useSidebar(defaultOpen);
  
  // Use initialState if provided (for hydration/SSR purposes)
  const contextValue = useMemo(
    () => initialState || sidebarLogic,
    [initialState, sidebarLogic]
  );

  // The provider is now purely a data container
  return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>;
}

// Basic context accessor with no side effects
export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }

  return context;
};
