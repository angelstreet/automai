'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCurrentSession() {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return { error };
  }

  if (!session) {
    return { error: 'No session found' };
  }

  return { session };
}
