'use client';

import { createContext } from 'react';

import type { User } from '@/types/service/userServiceType';

// Define the minimal context type needed
export interface UserContextType {
  user: User | null;
}

// Create context with default values
export const UserContext = createContext<UserContextType>({
  user: null,
});
