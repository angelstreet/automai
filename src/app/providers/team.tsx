'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

import { ResourceType, Operation, checkPermission } from '@/app/actions/permission';
import { Team } from '@/types/context/team';

// Create a minimal Team context interface
interface TeamContextState {
  teams: Team[];
  activeTeam: Team | null;
  loading: boolean;
  error: string | null;
}

// Create context with default values
const TeamContext = createContext<TeamContextState>({
  teams: [],
  activeTeam: null,
  loading: false,
  error: null,
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
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [activeTeam, setActiveTeam] = useState<Team | null>(initialActiveTeam);
  const [loading, setLoading] = useState(!initialTeams.length);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[@providers:team] TeamProvider initialized with:', {
      teamsCount: teams.length,
      activeTeam: activeTeam ? activeTeam.name : 'none',
    });
  }, [teams.length, activeTeam]);

  // Create the context value
  const value = {
    teams,
    activeTeam,
    loading,
    error,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

// Export hook for using team context
export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
}

// Export usePermission hook
export function usePermission() {
  const { checkPermission } = useTeam();
  return { checkPermission };
}
