'use client';

import React, { createContext, useContext, useState } from 'react';
import {  User  } from '@/types/service/userServiceType';
import { useUser } from '@/hooks/user';

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
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  // Use the hook to manage user state
  const { user, isLoading } = useUser(initialUser);

  console.debug(
    '[@context:UserContext:UserProvider] Initializing with initialUser:',
    initialUser ? `${initialUser.id} (${initialUser.email})` : 'null',
  );
  
  // Provide only the data without implementation details
  const value = {
    user,
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
