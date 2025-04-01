'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';

import {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
} from '@/components/sidebar/constants';

// Create a safe version of useLayoutEffect that falls back to useEffect during SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useSidebarLogic(defaultOpen = true) {
  // States
  const [open, setOpen] = useState(defaultOpen);
  const [state, setState] = useState<'expanded' | 'collapsed'>(
    defaultOpen ? 'expanded' : 'collapsed'
  );
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Reference to track if singleton is initialized
  const contextInitializedRef = useRef(false);

  // Check for multiple instances
  useEffect(() => {
    if (contextInitializedRef.current) {
      console.warn(
        '[@hooks:useSidebarLogic] Multiple instances detected. This may cause unexpected behavior.'
      );
    } else {
      contextInitializedRef.current = true;
      console.log('[@hooks:useSidebarLogic] Successfully initialized singleton instance');
    }
    
    return () => {
      // Only reset if this instance set it to true
      if (contextInitializedRef.current) {
        contextInitializedRef.current = false;
      }
    };
  }, []);

  // Sync with localStorage/cookies after initial render
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    try {
      // Sync the current state with localStorage for future visits
      localStorage.setItem(SIDEBAR_COOKIE_NAME, String(open));
      // Ensure cookie is also set for cross-tab persistence
      Cookies.set(SIDEBAR_COOKIE_NAME, String(open), { path: '/' });
      console.log(
        `[@hooks:useSidebarLogic:useEffect] Synced initial state to storage: ${open ? 'expanded' : 'collapsed'}`
      );
    } catch (e) {
      console.error('[@hooks:useSidebarLogic:useEffect] ERROR: Error syncing sidebar state', e);
    }

    setIsInitialized(true);
  }, [open, isInitialized]);

  // Handle mobile detection
  const checkIsMobile = useCallback(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
    }
  }, []);

  useEffect(() => {
    checkIsMobile();

    if (typeof window !== 'undefined') {
      // Use a debounced resize handler to prevent excessive updates
      let resizeTimer: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(checkIsMobile, 100);
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
      };
    }
  }, [checkIsMobile]);

  // Toggle sidebar state
  const toggleSidebar = useCallback(() => {
    const newOpen = !open;
    console.log(
      `[@hooks:useSidebarLogic:toggleSidebar] Toggling sidebar: ${open ? 'expanded' : 'collapsed'} -> ${newOpen ? 'expanded' : 'collapsed'}`
    );

    setOpen(newOpen);
    setState(newOpen ? 'expanded' : 'collapsed');

    // Update both cookie and localStorage to ensure consistency
    if (typeof window !== 'undefined') {
      try {
        // Update localStorage first (faster access next time)
        localStorage.setItem(SIDEBAR_COOKIE_NAME, String(newOpen));
        // Also update cookie for cross-tab persistence
        Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { path: '/' });
        console.log(
          `[@hooks:useSidebarLogic:toggleSidebar] Updated storage with new state: ${newOpen ? 'expanded' : 'collapsed'}`
        );
      } catch (e) {
        // If localStorage fails, still try to use cookies
        console.error('[@hooks:useSidebarLogic:toggleSidebar] ERROR: Error storing sidebar state', e);
        Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { path: '/' });
      }
    }
  }, [open]);

  // Handle CSS variables
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const sidebarOffset = open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;
      
      // Set CSS variable for sidebar width
      root.style.setProperty('--sidebar-width-offset', sidebarOffset);
      
      console.log(
        `[@hooks:useSidebarLogic:useEffect] Updated sidebar width to ${sidebarOffset} (state: ${open ? 'expanded' : 'collapsed'})`
      );
    }
  }, [open]);

  // Initial CSS setup
  useIsomorphicLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // Immediately disable transitions to prevent initial layout shift
      root.style.setProperty('transition', 'none');

      // Set initial width
      const initialOffset = open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;
      console.log(
        `[@hooks:useSidebarLogic:useLayoutEffect] Initial layout effect, setting width to ${initialOffset} (state: ${open ? 'expanded' : 'collapsed'})`
      );

      // Set CSS variable for sidebar width
      root.style.setProperty('--sidebar-width-offset', initialOffset);

      // Force reflow to apply styles before any rendering
      document.body.offsetHeight;

      // Restore transitions after a brief delay
      const timer = setTimeout(() => {
        root.style.removeProperty('transition');
        console.log(`[@hooks:useSidebarLogic:useLayoutEffect] Restored transitions after layout`);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, []);

  return {
    state,
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar
  };
}