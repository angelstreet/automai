'use client';
import { useSidebar as useContextSidebar } from '@/context/SidebarContext';

export function useSidebar() {
  return useContextSidebar();
}
