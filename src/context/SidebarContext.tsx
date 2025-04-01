'use client';

import { createContext } from 'react';

import type { SidebarContext as SidebarContextType } from '@/types/context/sidebarContextType';

/**
 * Sidebar context definition
 * This is a minimal type definition for the context
 * No business logic belongs here, that goes in hooks/sidebar/useSidebar.ts
 *
 * The provider implementation is in app/providers/SidebarProvider.tsx
 * The hook implementation is exported from app/providers/index.ts
 */
export const SidebarContext = createContext<SidebarContextType | null>(null);
