'use client';

import React, { createContext, useContext } from 'react';
import type { Team } from '@/types/context/teamContextType';

// Create a minimal Team context interface - data only
interface TeamContextState {
  teams: Team[];
  activeTeam: Team | null;
}

// Create context with default values
const TeamContext = createContext<TeamContextState>({
  teams: [],
  activeTeam: null,
});

interface TeamProviderProps {
  children: React.ReactNode;
  teamsDetails: Team[];
  activeTeam?: Team | null;
}

/**
 * TeamProvider - Pure data container for team state
 * No business logic, no data fetching, no side effects
 */
export function TeamProvider({
  children,
  teamsDetails = [],
  activeTeam = null,
}: TeamProviderProps) {
  // Provide only the data without any state management
  const value = {
    teams: teamsDetails,
    activeTeam,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

// Simple context accessor
export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
}
