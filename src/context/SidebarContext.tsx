'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { SidebarContext as SidebarContextType } from '@/types/sidebar';
import { SIDEBAR_COOKIE_NAME } from '@/components/sidebar/constants';

export const SidebarContext = createContext<SidebarContextType | null>(null);

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  // Initialize state from cookie if available, otherwise use defaultOpen
  const initialOpen =
    typeof window !== 'undefined' ? Cookies.get(SIDEBAR_COOKIE_NAME) !== 'false' : defaultOpen;

  const [open, setOpen] = useState(initialOpen);
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [state, setState] = useState<'expanded' | 'collapsed'>(
    initialOpen ? 'expanded' : 'collapsed',
  );

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

    // Update cookie
    if (typeof window !== 'undefined') {
      Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { path: '/' });
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

  return context;
};
