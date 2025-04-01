'use client';

import React, { createContext, useContext } from 'react';

import type { User } from '@/types/service/userServiceType';

// Define the minimal context type needed - data only
interface UserContextType {
  user: User | null;
}

// Create context with default values
const UserContext = createContext<UserContextType>({
  user: null,
});

export function UserProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: User | null;
}) {
  // Provide only the data without implementation details
  const value = {
    user: user || null,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Simple context accessor without business logic
export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
