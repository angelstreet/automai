'use client';

import React, { createContext, useContext, useState } from 'react';
import { Team } from '@/types/context/teamContextType';

// Create a minimal Team context interface with just data
interface TeamContextState {
  teamsDetails: Team[];
  activeTeam: Team | null;
  teamsLoading: boolean;
  teamsError: any;
}

// Create context with default values
const TeamContext = createContext<TeamContextState>({
  teamsDetails: [],
  activeTeam: null,
  teamsLoading: false,
  teamsError: null,
});

interface TeamProviderProps {
  children: React.ReactNode;
  teamsDetails: Team[];
  activeTeam?: Team | null;
}

export function TeamProvider({
  children,
  teamsDetails = [],
  activeTeam = null,
}: TeamProviderProps) {
  // Simple state management - just hold the data
  const [teamsDetailsState] = useState<Team[]>(teamsDetails);
  const [activeTeamState] = useState<Team | null>(activeTeam);
  const [teamsLoading] = useState(false);
  const [teamsError] = useState(null);

  // Create the context value - data only
  const value = {
    teamsDetails: teamsDetailsState,
    activeTeam: activeTeamState,
    teamsLoading,
    teamsError,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

// Export hook for using team context
export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
}
