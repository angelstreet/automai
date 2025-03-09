'use client';
import { useEffect, useLayoutEffect } from 'react';
import { useSidebar as useContextSidebar } from '@/context/SidebarContext';
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';

// Create a safe version of useLayoutEffect that falls back to useEffect during SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useSidebar() {
  const sidebarContext = useContextSidebar();
  
  // Use useLayoutEffect to set CSS variable for sidebar width offset before browser paint
  // This helps prevent layout shifts and flickering
  useIsomorphicLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const offset = sidebarContext.open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;
      
      // Ensure we clean up any existing px units if present
      // This makes sure the value is used consistently
      const cleanOffset = offset.replace('px', '').trim();
      
      // Apply the CSS variable with proper units
      root.style.setProperty('--sidebar-width-offset', offset);
      
      // For legacy support, also set as a numeric value for calc functions
      root.style.setProperty('--sidebar-width-offset-value', cleanOffset);
      
      // Also set a class on the body to help with responsive styling
      if (sidebarContext.open) {
        document.body.classList.add('sidebar-expanded');
        document.body.classList.remove('sidebar-collapsed');
      } else {
        document.body.classList.add('sidebar-collapsed');
        document.body.classList.remove('sidebar-expanded');
      }
    }
  }, [sidebarContext.open]);
  
  return sidebarContext;
}
