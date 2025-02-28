import { createContext } from 'react';

import { SidebarContext as SidebarContextType } from '@/types/sidebar';

export const SidebarContext = createContext<SidebarContextType | null>(null);
