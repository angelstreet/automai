'use client';

import { useContext } from 'react';

import { SidebarContext } from '@/context/SidebarContext';

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
 * Hook for interacting with the sidebar state
 * Provides access to sidebar state and methods to control it
 *
 * @param componentName Name of the component using this hook (for debugging)
 */
export function useSidebar(componentName = 'unknown') {
  const context = useContext(SidebarContext);

  if (context === undefined) {
    console.error(`[useSidebar] Hook used outside of SidebarProvider in ${componentName}`);
    throw new Error('useSidebar must be used within a SidebarProvider');
  }

  // Log usage in development
  if (process.env.NODE_ENV === 'development') {
    //console.debug(`[@hook:useSidebar:useSidebar] Hook used in component: ${componentName}`);
  }

  return context;
}
