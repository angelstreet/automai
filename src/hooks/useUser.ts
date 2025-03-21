'use client';

import { useUser as useAppUserContext } from '@/context';

/**
 * Hook to access user data and authentication functions
 * Uses the centralized AppContext pattern for consistent data handling
 * 
 * IMPORTANT: This is the only correct way to access user data throughout the application.
 * Do not import directly from context files.
 */
export const useUser = useAppUserContext;

export default useUser;
