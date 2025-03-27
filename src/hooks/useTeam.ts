'use client';

import { useUser } from '@/context';
import type { UserContextType } from '@/types/context/user';

/**
 * DEPRECATED: Compatibility hook for the old TeamContext
 * 
 * This hook redirects to useUser() and exists only for backward compatibility.
 * Please migrate your code to use useUser() directly!
 * 
 * This helps with the transition from TeamContext to the consolidated UserContext
 */
export function useTeam(): UserContextType {
  console.warn(
    '[DEPRECATED] The useTeam() hook is deprecated and will be removed in the future. ' +
    'Please use useUser() hook instead. See TEAM_MIGRATION_COMPLETE.md for details.'
  );
  
  return useUser();
} 