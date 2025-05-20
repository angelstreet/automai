'use client';

import React, { useEffect } from 'react';

import { SidebarContext } from '@/context/SidebarContext';
import { useIsMobile } from '@/hooks/useMobile';
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
  showTooltips = false,
}: {
  children: React.ReactNode;
  initialOpen?: boolean;
  initialOpenMobile?: boolean;
  initialIsMobile?: boolean;
  showTooltips?: boolean;
}) {
  const [open, setOpen] = React.useState<boolean>(initialOpen);
  const [openMobile, setOpenMobile] = React.useState<boolean>(initialOpenMobile);
  const [isMobile, setIsMobile] = React.useState<boolean>(initialIsMobile);
  const [state, setState] = React.useState<'expanded' | 'collapsed'>('expanded');

  // Use the useIsMobile hook for automatic detection
  const isCurrentlyMobile = useIsMobile();

  // Update isMobile state when screen size changes
  useEffect(() => {
    console.log(
      `[@provider:SidebarProvider] Mobile detection: ${isCurrentlyMobile ? 'mobile' : 'desktop'}`,
    );
    setIsMobile(isCurrentlyMobile);

    // Add an attribute to the document for CSS targeting
    document.documentElement.setAttribute('data-is-mobile', isCurrentlyMobile ? 'true' : 'false');
  }, [isCurrentlyMobile]);

  // Original toggle behavior preserved
  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(!openMobile);
    } else {
      setOpen(!open);
      setState(!open ? 'expanded' : 'collapsed');
    }
  }, [open, openMobile, isMobile]);

  // Update state when open changes
  React.useEffect(() => {
    setState(open ? 'expanded' : 'collapsed');
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
    showTooltips,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

// No hooks exported from this provider - use @/hooks/sidebar instead
