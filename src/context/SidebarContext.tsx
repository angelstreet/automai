'use client';

import Cookies from 'js-cookie';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react';

import {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
} from '@/components/sidebar/constants';
import {  SidebarContext as SidebarContextType  } from '@/types/context/sidebarContextType';

// Singleton flag to prevent multiple instances
let SIDEBAR_CONTEXT_INITIALIZED = false;

export const SidebarContext = createContext<SidebarContextType | null>(null);

// Create a safe version of useLayoutEffect that falls back to useEffect during SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  console.log(
    `[@context:SidebarContext:SidebarProvider] Initializing with defaultOpen=${defaultOpen}`,
  );

  // Check for multiple instances of SidebarProvider
  useEffect(() => {
    if (SIDEBAR_CONTEXT_INITIALIZED) {
      console.warn(
        '[@context:SidebarContext:SidebarProvider] Multiple instances detected. This may cause unexpected behavior.',
      );
    } else {
      SIDEBAR_CONTEXT_INITIALIZED = true;
      console.log(
        '[@context:SidebarContext:SidebarProvider] Successfully initialized singleton instance',
      );
    }
    return () => {
      // Only reset if this instance set it to true
      if (SIDEBAR_CONTEXT_INITIALIZED) {
        SIDEBAR_CONTEXT_INITIALIZED = false;
      }
    };
  }, []);

  // Initialize state with the server-provided defaultOpen value
  // This ensures server and client rendering match
  const [open, setOpen] = useState(defaultOpen);
  const [state, setState] = useState<'expanded' | 'collapsed'>(
    defaultOpen ? 'expanded' : 'collapsed',
  );
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Only sync with localStorage/cookies after initial render to prevent overwrites
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    try {
      // Sync the current state with localStorage for future visits
      localStorage.setItem(SIDEBAR_COOKIE_NAME, String(open));
      // Ensure cookie is also set for cross-tab persistence
      Cookies.set(SIDEBAR_COOKIE_NAME, String(open), { path: '/' });
      console.log(
        `[@context:SidebarContext:useEffect] Synced initial state to storage: ${open ? 'expanded' : 'collapsed'}`,
      );
    } catch (e) {
      console.error('[@context:SidebarContext:useEffect] ERROR: Error syncing sidebar state', e);
    }

    setIsInitialized(true);
  }, [open, isInitialized]);

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
    console.log(
      `[@context:SidebarContext:toggleSidebar] Toggling sidebar: ${open ? 'expanded' : 'collapsed'} -> ${newOpen ? 'expanded' : 'collapsed'}`,
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
          `[@context:SidebarContext:toggleSidebar] Updated storage with new state: ${newOpen ? 'expanded' : 'collapsed'}`,
        );
      } catch (e) {
        // If localStorage fails, still try to use cookies
        console.error(
          '[@context:SidebarContext:toggleSidebar] ERROR: Error storing sidebar state',
          e,
        );
        Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { path: '/' });
      }
    }
  }, [open]);

  // Properly memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar],
  );

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

      // Use the context value directly (which now comes from server)
      const initialOffset = context.open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;
      console.log(
        `[@context:SidebarContext:useSidebar] Initial layout effect, setting width to ${initialOffset} (state: ${context.open ? 'expanded' : 'collapsed'})`,
      );

      // Set CSS variable for sidebar width
      root.style.setProperty('--sidebar-width-offset', initialOffset);

      // Force reflow to apply styles before any rendering
      document.body.offsetHeight;

      // Restore transitions after a brief delay
      const timer = setTimeout(() => {
        root.style.removeProperty('transition');
        console.log(`[@context:SidebarContext:useSidebar] Restored transitions after layout`);
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
      console.log(
        `[@context:SidebarContext:useSidebar] Updating width on state change: ${offset} (state: ${context.open ? 'expanded' : 'collapsed'})`,
      );

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
