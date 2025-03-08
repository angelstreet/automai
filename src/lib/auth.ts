import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Get the current user from Supabase Auth
 * Safe to use in Server Components
 */
export async function getUser(): Promise<User | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Get the current session from Supabase Auth
 * Safe to use in Server Components
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Sign out the current user
 * This is a server action that can be called from a form
 */
export async function signOut(formData: FormData) {
  'use server';
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  await supabase.auth.signOut();
  
  // Get locale from form data or default to 'en'
  const locale = formData.get('locale') as string || 'en';
  
  // Redirect to login page
  redirect(`/${locale}/login`);
}

/**
 * Update the current user's profile
 * This is a server action that can be called from a form
 */
export async function updateProfile(formData: FormData) {
  'use server';
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const name = formData.get('name') as string;
  const locale = formData.get('locale') as string || 'en';
  
  const { error } = await supabase.auth.updateUser({
    data: { name }
  });
  
  if (error) {
    // Redirect back with error
    redirect(`/${locale}/profile?error=${encodeURIComponent(error.message)}`);
  }
  
  // Redirect back to profile page
  redirect(`/${locale}/profile?success=Profile updated`);
} 