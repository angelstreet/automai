'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { User } from '@/types/auth/user';

// Define the minimal context type needed
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
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  // Simple state management - just use what's passed from props
  const [user] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(false);

  // Store user data in localStorage for persistence across page refreshes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('cached_user', JSON.stringify(user));
        localStorage.setItem('user_cache_timestamp', Date.now().toString());
      } catch (error) {
        console.error('[@context:UserContext] Error caching user data:', error);
      }
    }
  }, [user]);

  console.debug(
    '[@context:UserContext:UserProvider] Initializing with initialUser:',
    initialUser ? `${initialUser.id} (${initialUser.email})` : 'null',
  );
  // Create a minimal context value (without team selection)
  const value = {
    user,
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
