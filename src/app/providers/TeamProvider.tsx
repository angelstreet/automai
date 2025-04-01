'use client';

import React from 'react';

import { TeamContext } from '@/context/TeamContext';
import type { Team } from '@/types/context/teamContextType';

interface TeamProviderProps {
  children: React.ReactNode;
  teams: Team[];
  activeTeam: Team | null;
}

/**
 * TeamProvider - Pure data container for team state
 * No business logic, no data fetching, no side effects
 */
export function TeamProvider({ children, teams, activeTeam }: TeamProviderProps) {
  return <TeamContext.Provider value={{ teams, activeTeam }}>{children}</TeamContext.Provider>;
}
