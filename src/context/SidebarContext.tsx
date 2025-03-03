'use client';

import { createContext, useContext, useState, useEffect } from 'react';

import { SidebarContext as SidebarContextType } from '@/types/sidebar';

export const SidebarContext = createContext<SidebarContextType | null>(null);

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [state, setState] = useState<'expanded' | 'collapsed'>(
    defaultOpen ? 'expanded' : 'collapsed',
  );

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(_window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const toggleSidebar = () => {
    setOpen(!open);
    setState(!open ? 'expanded' : 'collapsed');
  };

  return (
    <SidebarContext.Provider
      value={{
        state,
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }

  return context;
};
