'use client';

import React, { createContext, useContext, useState } from 'react';
import { Team } from '@/types/context/team';

// Create a minimal Team context interface with just data
interface TeamContextState {
  teams: Team[];
  activeTeam: Team | null;
  teamsLoading: boolean;
  teamsError: any;
}

// Create context with default values
const TeamContext = createContext<TeamContextState>({
  teams: [],
  activeTeam: null,
  teamsLoading: false,
  teamsError: null,
});

interface TeamProviderProps {
  children: React.ReactNode;
  initialTeams?: Team[];
  initialActiveTeam?: Team | null;
}

export function TeamProvider({
  children,
  initialTeams = [],
  initialActiveTeam = null,
}: TeamProviderProps) {
  // Simple state management - just hold the data
  const [teams] = useState<Team[]>(initialTeams);
  const [activeTeam] = useState<Team | null>(initialActiveTeam);
  const [teamsLoading] = useState(false);
  const [teamsError] = useState(null);

  // Create the context value - data only
  const value = {
    teams,
    activeTeam,
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
