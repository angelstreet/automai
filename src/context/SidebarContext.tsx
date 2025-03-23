'use client';

import { createContext, useContext, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import Cookies from 'js-cookie';
import { SidebarContext as SidebarContextType } from '@/types/sidebar';
import { SIDEBAR_COOKIE_NAME, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';

export const SidebarContext = createContext<SidebarContextType | null>(null);

// Create a safe version of useLayoutEffect that falls back to useEffect during SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  // Use a function for initial state that's consistent between server and client
  const [open, setOpen] = useState(() => {
    // For SSR, always use defaultOpen as fallback
    if (typeof window === 'undefined') {
      return defaultOpen;
    }
    
    // For client, try to get the state from localStorage first, then cookie as fallback
    try {
      const storedValue = localStorage.getItem(SIDEBAR_COOKIE_NAME);
      if (storedValue !== null) {
        return storedValue !== 'false';
      }
      
      const cookieValue = Cookies.get(SIDEBAR_COOKIE_NAME);
      if (cookieValue !== undefined) {
        // Also store in localStorage for future use
        localStorage.setItem(SIDEBAR_COOKIE_NAME, cookieValue);
        return cookieValue !== 'false';
      }
    } catch (e) {
      // In case of any localStorage errors, fall back to defaultOpen
      console.error('Error accessing localStorage', e);
    }
    
    return defaultOpen;
  });

  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [state, setState] = useState<'expanded' | 'collapsed'>(() => {
    return open ? 'expanded' : 'collapsed';
  });

  // Use useCallback for the resize handler to prevent recreation on each render
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

  // Use useCallback for toggleSidebar to prevent recreation on each render
  const toggleSidebar = useCallback(() => {
    const newOpen = !open;
    setOpen(newOpen);
    setState(newOpen ? 'expanded' : 'collapsed');

    // Update both cookie and localStorage to ensure consistency
    if (typeof window !== 'undefined') {
      try {
        // Update localStorage first (faster access next time)
        localStorage.setItem(SIDEBAR_COOKIE_NAME, String(newOpen));
        // Also update cookie for cross-tab persistence
        Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { path: '/' });
      } catch (e) {
        // If localStorage fails, still try to use cookies
        console.error('Error storing sidebar state', e);
        Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { path: '/' });
      }
    }
  }, [open]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = {
    state,
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
  };

  return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>;
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  
  // First render: ensure CSS variables are set immediately on mount
  useIsomorphicLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Immediately disable transitions to prevent initial layout shift
      root.style.setProperty('transition', 'none');
      
      // Get the initial width from local storage if available
      let initialOpen = context.open;
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
      const offset = context.open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;
      root.style.setProperty('--sidebar-width-offset', offset);

      // Also set a class on the body to help with responsive styling
      if (context.open) {
        document.body.classList.add('sidebar-expanded');
        document.body.classList.remove('sidebar-collapsed');
      } else {
        document.body.classList.add('sidebar-collapsed');
        document.body.classList.remove('sidebar-expanded');
      }
    }
  }, [context.open]);

  return {
    ...context,
    // Ensure isOpen is available for backward compatibility
    isOpen: context.open,
  };
};
