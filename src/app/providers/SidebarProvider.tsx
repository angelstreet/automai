'use client';

import React, { useContext } from 'react';

import { SidebarContext } from '@/context/SidebarContext';
import type { SidebarContext as SidebarContextType } from '@/types/context/sidebarContextType';

interface SidebarProviderProps {
  children: React.ReactNode;
  sidebarState: SidebarContextType;
}

/**
 * SidebarProvider - Pure data container for sidebar state
 * No business logic, no data fetching, no side effects
 */
export function SidebarProvider({ children, sidebarState }: SidebarProviderProps) {
  return <SidebarContext.Provider value={sidebarState}>{children}</SidebarContext.Provider>;
}

/**
 * Context accessor - only exports the context value
 * Business logic should be in hooks/sidebar/useSidebar.ts
 */
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
  return context;
}
