'use client';

import React, { createContext, useContext, useState } from 'react';
import { User, UserTeam } from '@/types/user';

// Define the minimal context type needed
interface UserContextType {
  user: User | null;
  teams: UserTeam[];
  isLoading: boolean;
}

// Create context with default values
const UserContext = createContext<UserContextType>({
  user: null,
  teams: [],
  isLoading: false,
});

// UserProvider component - only uses props, no fetching
export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  // Simple state management - just use what's passed from props
  const [user] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(false);

  console.debug(
    '[@context:UserContext:UserProvider] Initializing with initialUser:',
    initialUser ? `${initialUser.id} (${initialUser.email})` : 'null',
  );

  // Compute derived state
  const teams = user?.teams || [];

  // Create a minimal context value (without team selection)
  const value = {
    user,
    teams,
    isLoading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Export hook separately to avoid Fast Refresh warning
export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
