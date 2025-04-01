'use client';

import { createContext } from 'react';

import type { Team } from '@/types/context/teamContextType';

// Create a minimal Team context interface - data only
export interface TeamContextState {
  teams: Team[];
  activeTeam: Team | null;
}

// Create context with default values
export const TeamContext = createContext<TeamContextState>({
  teams: [],
  activeTeam: null,
});
