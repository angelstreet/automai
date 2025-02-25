import { createContext, useContext } from 'react';
import { SidebarContext as SidebarContextType } from '@/types/sidebar';

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}

export { SidebarContext }; 