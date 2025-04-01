'use client';

import Cookies from 'js-cookie';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  Suspense,
} from 'react';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/sidebar';
import { SidebarClient } from '@/components/sidebar/SidebarClient';
import {
  APP_SIDEBAR_WIDTH,
  APP_SIDEBAR_WIDTH_ICON,
  SIDEBAR_COOKIE_NAME,
} from '@/components/sidebar/constants';
import { cn } from '@/lib/utils';
import { SidebarContext as SidebarContextType } from '@/types/context/sidebarContextType';
import { User } from '@/types/service/userServiceType';

// Create a safe version of useLayoutEffect that falls back to useEffect during SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Create context with a null default value
export const SidebarContext = createContext<SidebarContextType | null>(null);

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  initialState?: SidebarContextType;
  user: User | null;
}

// Internal hook for sidebar logic
function useSidebarLogic(defaultOpen = true) {
  // States
  const [open, setOpen] = useState(defaultOpen);
  const [state, setState] = useState<'expanded' | 'collapsed'>(
    defaultOpen ? 'expanded' : 'collapsed',
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
        '[@hooks:useSidebarLogic] Multiple instances detected. This may cause unexpected behavior.',
      );
    } else {
      contextInitializedRef.current = true;
      console.log('[@hooks:useSidebarLogic] Successfully initialized singleton instance');
    }

    return () => {
      if (contextInitializedRef.current) {
        contextInitializedRef.current = false;
      }
    };
  }, []);

  // Sync with localStorage/cookies after initial render
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    try {
      localStorage.setItem(SIDEBAR_COOKIE_NAME, String(open));
      Cookies.set(SIDEBAR_COOKIE_NAME, String(open), { path: '/' });
      console.log(
        `[@hooks:useSidebarLogic:useEffect] Synced initial state to storage: ${open ? 'expanded' : 'collapsed'}`,
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
    setOpen(newOpen);
    setState(newOpen ? 'expanded' : 'collapsed');

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SIDEBAR_COOKIE_NAME, String(newOpen));
        Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { path: '/' });
      } catch (e) {
        console.error(
          '[@hooks:useSidebarLogic:toggleSidebar] ERROR: Error storing sidebar state',
          e,
        );
        Cookies.set(SIDEBAR_COOKIE_NAME, String(newOpen), { path: '/' });
      }
    }
  }, [open]);

  // Handle CSS variables
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const sidebarOffset = open ? APP_SIDEBAR_WIDTH : APP_SIDEBAR_WIDTH_ICON;
      root.style.setProperty('--sidebar-width-offset', sidebarOffset);
    }
  }, [open]);

  // Initial CSS setup
  useIsomorphicLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('transition', 'none');
      const initialOffset = open ? APP_SIDEBAR_WIDTH : APP_SIDEBAR_WIDTH_ICON;
      root.style.setProperty('--sidebar-width-offset', initialOffset);
      document.body.offsetHeight;
      const timer = setTimeout(() => {
        root.style.removeProperty('transition');
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
    toggleSidebar,
  };
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  initialState,
  user,
}: SidebarProviderProps) {
  // Use the internal hook for all business logic
  const sidebarLogic = useSidebarLogic(defaultOpen);

  // Use initialState if provided (for hydration/SSR purposes)
  const contextValue = initialState || sidebarLogic;

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className="relative flex w-full overflow-hidden">
        <Suspense
          fallback={
            <Sidebar
              collapsible="icon"
              variant="floating"
              className="fixed left-0 top-0 z-30 animate-in fade-in-50 duration-500"
              style={
                {
                  '--sidebar-width': APP_SIDEBAR_WIDTH,
                  '--sidebar-width-icon': APP_SIDEBAR_WIDTH_ICON,
                } as React.CSSProperties
              }
            >
              <SidebarHeader className="p-1.5">
                <div className="h-10 bg-muted/30 rounded-md animate-pulse" />
              </SidebarHeader>
              <SidebarContent className="pt-2">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="px-2 py-1 mb-4">
                      <div className="h-4 w-24 bg-muted/30 rounded-md animate-pulse mb-3" />
                      {Array(i + 2)
                        .fill(0)
                        .map((_, j) => (
                          <div
                            key={j}
                            className="h-8 bg-muted/20 rounded-md animate-pulse mb-2 mx-1"
                          />
                        ))}
                    </div>
                  ))}
              </SidebarContent>
              <SidebarFooter className="pb-2">
                <div className="h-10 mx-auto w-[90%] bg-muted/30 rounded-md animate-pulse" />
              </SidebarFooter>
            </Sidebar>
          }
        >
          <SidebarClient user={user} />
        </Suspense>
        <div
          className={cn(
            'flex-1 flex flex-col w-full overflow-hidden transition-[margin,width] duration-300 ease-in-out',
            contextValue.open
              ? ''
              : 'ml-[var(--sidebar-width-offset,0)] w-[calc(100%-var(--sidebar-width-offset,0))]',
          )}
        >
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

// Hook to access sidebar context
export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }

  return context;
};
