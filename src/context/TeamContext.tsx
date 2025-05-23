'use client';

import { createContext } from 'react';

import type { Team } from '@/types/context/teamContextType';

/**
 * Team context state interface
 * This is a minimal type definition for the context
 * No business logic belongs here, that goes in hooks/team/useTeam.ts
 */
export interface TeamContextState {
  teams: Team[];
  activeTeam: Team | null;
  resourceCounts?: any;
  loading?: boolean;
}

/**
 * Context definition with default values
 * Used by TeamProvider in /app/providers/TeamProvider.tsx
 * Business logic should be imported from '@/hooks/team'
 */
export const TeamContext = createContext<TeamContextState>({
  teams: [],
  activeTeam: null,
  resourceCounts: null,
  loading: false,
});
