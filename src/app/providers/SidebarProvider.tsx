'use client';

import { createContext, useContext, Suspense } from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/sidebar';
import { SidebarClient } from '@/components/sidebar/SidebarClient';
import { APP_SIDEBAR_WIDTH, APP_SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';
import { SidebarContext as SidebarContextType } from '@/types/context/sidebarContextType';
import { useSidebar } from '@/hooks/sidebar';
import { User } from '@/types/service/userServiceType';
import { cn } from '@/lib/utils';

// Create context with a null default value
export const SidebarContext = createContext<SidebarContextType | null>(null);

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  initialState?: SidebarContextType;
  user: User | null;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  initialState,
  user,
}: SidebarProviderProps) {
  // Use the hook for all business logic
  const sidebarLogic = useSidebar(defaultOpen);

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

// Basic context accessor with no side effects
export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }

  return context;
};
