'use client';
import { useEffect, useLayoutEffect } from 'react';
import { useSidebar as useContextSidebar } from '@/context/SidebarContext';
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';

// Create a safe version of useLayoutEffect that falls back to useEffect during SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useSidebar() {
  const sidebarContext = useContextSidebar();

  // First render: ensure CSS variables are set immediately on mount
  useIsomorphicLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Immediately disable transitions to prevent initial layout shift
      root.style.setProperty('transition', 'none');
      
      // Get the initial width from local storage if available
      let initialOpen = sidebarContext.open;
      try {
        const savedState = localStorage.getItem(SIDEBAR_COOKIE_NAME);
        if (savedState !== null) {
          initialOpen = savedState !== 'false';
        }
      } catch (e) {
        // Fallback to context value if localStorage fails
      }
      
      // Calculate initial offset based on the determined state
      const initialOffset = initialOpen ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;
      
      // Set CSS variable for sidebar width
      root.style.setProperty('--sidebar-width-offset', initialOffset);
      
      // Force reflow to apply styles before any rendering
      document.body.offsetHeight;
      
      // Restore transitions after a brief delay
      const timer = setTimeout(() => {
        root.style.removeProperty('transition');
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Use useLayoutEffect to set CSS variable for sidebar width offset before browser paint
  // This helps prevent layout shifts and flickering for subsequent state changes
  useIsomorphicLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const offset = sidebarContext.open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;
      root.style.setProperty('--sidebar-width-offset', offset);

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

  return {
    ...sidebarContext,
    // Ensure isOpen is available for backward compatibility
    isOpen: sidebarContext.open,
  };
}
