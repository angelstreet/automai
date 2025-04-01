'use client';

import { createContext } from 'react';

import type { SidebarContext as SidebarContextType } from '@/types/context/sidebarContextType';

export const SidebarContext = createContext<SidebarContextType | null>(null);
