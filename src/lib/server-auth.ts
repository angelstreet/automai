import { createClient } from '@/lib/supabase';

import type { User, Session } from '@supabase/supabase-js';

/**
 * Get the current user from the server
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session from the server
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
} 