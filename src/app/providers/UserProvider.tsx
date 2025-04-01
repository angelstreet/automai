'use client';

import React, { createContext, useContext } from 'react';

import { useUser as useUserHook } from '@/hooks';

import { User } from '@/types/service';

// Define the minimal context type needed - data only
interface UserContextType {
  user: User | null;
  isLoading: boolean;
}

// Create context with default values
const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: false,
});

export function UserProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: User | null;
}) {
  // Use the hook to manage user state
  const { user: currentUser, isLoading } = useUserHook(user);

  console.debug(
    '[@context:UserContext:UserProvider] Initializing with user:',
    user ? `${user.id} (${user.email})` : 'null',
  );

  // Provide only the data without implementation details
  const value = {
    user: currentUser,
    isLoading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Simple context accessor without business logic
export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
