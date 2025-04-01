'use client';

import { useContext } from 'react';

import { SidebarContext } from '@/context/SidebarContext';
import type { SidebarContext as SidebarContextType } from '@/types/context/sidebarContextType';

/**
 * Access the sidebar context
 * This is a simple hook that just provides access to the context
 */
export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}

/**
 * Primary sidebar hook with business logic
 * Use this hook in components
 */
export function useSidebar() {
  return useSidebarContext();
}
