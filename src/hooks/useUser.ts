'use client';

import { useUser as useAppUserContext } from '@/context/AppContext';

/**
 * Hook to access user data and authentication functions
 * Uses the centralized AppContext pattern for consistent data handling
 */
export const useUser = useAppUserContext;

export default useUser;
