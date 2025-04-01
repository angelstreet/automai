'use client';

import { createContext } from 'react';

import type { User } from '@/types/service/userServiceType';

/**
 * User context type definition
 * This is a minimal type definition for the context
 * No business logic belongs here, that goes in hooks/user/useUser.ts
 */
export interface UserContextType {
  user: User | null;
}

/**
 * Context definition with default values
 * Used by UserProvider in /app/providers/UserProvider.tsx
 * Business logic should be imported from '@/hooks/user'
 */
export const UserContext = createContext<UserContextType>({
  user: null,
});
