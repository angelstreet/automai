'use client';

import React from 'react';

import { UserContext } from '@/context/UserContext';
import type { User } from '@/types/service/userServiceType';

interface UserProviderProps {
  children: React.ReactNode;
  user: User | null;
}

/**
 * UserProvider - Pure data container for user state
 * No business logic, no data fetching, no side effects
 */
export function UserProvider({ children, user }: UserProviderProps) {
  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
}

/**
 * Context accessor - only exports the context value
 * Business logic should be in hooks/user/useUser.ts
 */
export function useUser() {
  const context = React.useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
