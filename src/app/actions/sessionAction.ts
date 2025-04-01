'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';

import userDb from '@/lib/db/userDb';
import { createClient } from '@/lib/supabase/server';
import { AuthUser } from '@/types/service/userServiceType';

/**
 * Get the current session on the server
 * This function should be used by middleware and server components
 */
export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('[@action:session:getCurrentSession] Error getting session:', error);
    return { error };
  }

  if (!session) {
    return { error: 'No session found' };
  }

  return { session };
});

/**
 * Get the current user for client components
 * This function is safe to call from UserContext
 * It will not attempt to modify cookies in client components
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const cookieStore = await cookies();
    const user = await userDb.getCurrentUser(cookieStore);

    console.log('[@action:session:getCurrentUser] Fetched user data', {
      userId: user?.id || 'none',
      userEmail: user?.email || 'none',
    });

    return user;
  } catch (error) {
    console.error('[@action:session:getCurrentUser] Error:', error);
    return null;
  }
});
