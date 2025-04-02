'use client';

import React from 'react';

import { TeamContext } from '@/context/TeamContext';
import type { Team } from '@/types/context/teamContextType';

interface TeamProviderProps {
  children: React.ReactNode;
  teams: Team[];
  activeTeam: Team | null;
  resourceCounts?: any;
  initialLoading?: boolean;
  setSelectedTeam?: (teamId: string) => Promise<void>;
}

/**
 * TeamProvider - Pure data container for team state
 * No business logic, no data fetching, no side effects
 */
export function TeamProvider({
  children,
  teams,
  activeTeam,
  resourceCounts = null,
  initialLoading = false,
  setSelectedTeam,
}: TeamProviderProps) {
  const [loading, _setLoading] = React.useState(initialLoading);

  return (
    <TeamContext.Provider
      value={{
        teams,
        activeTeam,
        resourceCounts,
        loading,
        setSelectedTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
