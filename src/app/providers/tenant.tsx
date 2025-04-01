'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

import { Team } from '@/types/context/team';
import { User } from '@/types/auth/user';

// Define the context type
interface TenantContextType {
  tenant: string;
  user: User | null;
  teams: Team[];
  activeTeam: Team | null;
  isLoading: boolean;
}

// Create context with default values
const TenantContext = createContext<TenantContextType>({
  tenant: '',
  user: null,
  teams: [],
  activeTeam: null,
  isLoading: false,
});

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant: string;
  initialUser: User | null;
  initialTeams: Team[];
  initialActiveTeam: Team | null;
}

export function TenantProvider({
  children,
  initialTenant,
  initialUser,
  initialTeams,
  initialActiveTeam,
}: TenantProviderProps) {
  const [tenant] = useState<string>(initialTenant);
  const [user] = useState<User | null>(initialUser);
  const [teams] = useState<Team[]>(initialTeams);
  const [activeTeam] = useState<Team | null>(initialActiveTeam);
  const [isLoading] = useState(false);

  // Log initialization
  useEffect(() => {
    console.log('[@providers:tenant] TenantProvider initialized with:', {
      tenant,
      user: user ? `${user.id} (${user.email})` : 'null',
      teamsCount: teams.length,
      activeTeam: activeTeam ? activeTeam.name : 'none',
    });
  }, [tenant, user, teams, activeTeam]);

  // Create context value
  const value = {
    tenant,
    user,
    teams,
    activeTeam,
    isLoading,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

// Hook for accessing tenant context
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}