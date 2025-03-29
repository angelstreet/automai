import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Get the current authenticated user in a server component or server action
 * @returns The authenticated user or null if not authenticated
 */
export async function getCurrentUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Server-side auth check that redirects to login if not authenticated
 * Use this in layout.tsx or page.tsx files
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export default {
  getCurrentUser,
  requireAuth,
};
