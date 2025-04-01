'use client';

import React from 'react';

import { SidebarContext } from '@/context/SidebarContext';
import { SidebarContext as SidebarContextType } from '@/types/context/sidebarContextType';

/**
 * SidebarProvider manages the sidebar state for the application
 * This component only handles sidebar state, no business logic included
 * To access sidebar functionality, use the useSidebar hook from @/hooks/sidebar
 */
export function SidebarProvider({
  children,
  initialOpen = true,
  initialOpenMobile = false,
  initialIsMobile = false,
}: {
  children: React.ReactNode;
  initialOpen?: boolean;
  initialOpenMobile?: boolean;
  initialIsMobile?: boolean;
}) {
  const [open, setOpen] = React.useState<boolean>(initialOpen);
  const [openMobile, setOpenMobile] = React.useState<boolean>(initialOpenMobile);
  const [isMobile, setIsMobile] = React.useState<boolean>(initialIsMobile);
  const [state, setState] = React.useState<'expanded' | 'collapsed'>('expanded');

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open);
  }, [open]);

  // Provide state container only, business logic in hooks/sidebar
  const value: SidebarContextType = {
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
    state,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

// No hooks exported from this provider - use @/hooks/sidebar instead
