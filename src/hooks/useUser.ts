'use client';

import { useUser as useUserContext } from '@/context/UserContext';

/**
 * Hook to access user data and authentication functions
 * Re-exports the UserContext hook for consistent import paths
 */
export const useUser = useUserContext;

export default useUser;