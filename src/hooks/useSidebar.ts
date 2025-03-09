'use client';
import { useEffect } from 'react';
import { useSidebar as useContextSidebar } from '@/context/SidebarContext';
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from '@/components/sidebar/constants';

export function useSidebar() {
  const sidebarContext = useContextSidebar();
  
  // Set CSS variable for sidebar width offset
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const offset = sidebarContext.open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON;
      root.style.setProperty('--sidebar-width-offset', offset);
    }
  }, [sidebarContext.open]);
  
  return sidebarContext;
}
