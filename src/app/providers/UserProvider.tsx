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
  user,
}: {
  children: React.ReactNode;
  user?: User | null;
}) {
  const [userData, _setUserData] = React.useState<User | null>(user || null);
  const [loading, _setLoading] = React.useState<boolean>(false);
  const [error, _setError] = React.useState<Error | null>(null);
  const [isInitialized, _setIsInitialized] = React.useState<boolean>(false);

  // Dummy function implementations for the context interface
  // The actual implementations will be in the useUser hook
  const updateProfile = async () => Promise.resolve();
  const refreshUser = async () => Promise.resolve(null);
  const updateRole = async () => Promise.resolve();
  const clearCache = async () => Promise.resolve();

  // Provide state container only, business logic in hooks/user
  const value: UserContextType = {
    user: userData,
    loading,
    error,
    updateProfile,
    refreshUser,
    updateRole,
    clearCache,
    isInitialized,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// No hooks exported from this provider - use @/hooks/user instead
