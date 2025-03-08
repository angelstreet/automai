import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Get the current user from the server
 */
export async function getUser(): Promise<User | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session from the server
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();
  return session;
} 