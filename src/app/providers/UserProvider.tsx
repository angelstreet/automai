'use client';

import React from 'react';

import { UserContext } from '@/context/UserContext';
import { User } from '@/types/component/userComponentType';
import { UserContextType } from '@/types/context/userContextType';

/**
 * UserProvider manages the user state for the application
 * This component only handles user state, no business logic included
 * To access user functionality, use the useUser hook from @/hooks/user
 */
export function UserProvider({
  children,
  initialUser,
  initialTeams,
  initialSelectedTeam,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
  initialTeams?: any[];
  initialSelectedTeam?: any;
}) {
  const [user, setUser] = React.useState<User | null>(initialUser || null);
  const [teams, setTeams] = React.useState<any[]>(initialTeams || []);
  const [selectedTeam, setSelectedTeam] = React.useState<any>(initialSelectedTeam || null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [teamMembers, setTeamMembers] = React.useState<any[]>([]);
  const [isInitialized, setIsInitialized] = React.useState<boolean>(false);

  // Dummy function implementations for the context interface
  // The actual implementations will be in the useUser hook
  const updateProfile = async () => Promise.resolve();
  const refreshUser = async () => Promise.resolve(null);
  const updateRole = async () => Promise.resolve();
  const clearCache = async () => Promise.resolve();
  const signUp = async () => Promise.resolve(null);
  const signInWithOAuth = async () => Promise.resolve(null);
  const setSelectedTeamFunc = async () => Promise.resolve();
  const checkResourceLimit = async () => Promise.resolve(null);

  // Provide state container only, business logic in hooks/user
  const value: UserContextType = {
    user,
    teams,
    selectedTeam,
    teamMembers,
    loading,
    error,
    updateProfile,
    refreshUser,
    updateRole,
    clearCache,
    isInitialized,
    signUp,
    signInWithOAuth,
    setSelectedTeam: setSelectedTeamFunc,
    checkResourceLimit,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// No hooks exported from this provider - use @/hooks/user instead
