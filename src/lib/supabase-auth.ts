import { createBrowserSupabase } from './supabase';

/**
 * Helper function to determine production environment and get the appropriate redirect URL
 * Dynamically handles locales based on current URL path
 */
const getRedirectUrl = (path: string = '/auth/callback'): string => {
  // Only run on client side
  if (typeof window === 'undefined') {
    return path;
  }

  // Get base URL from current location
  const baseUrl = window.location.origin;
  
  // Extract locale from current path if it exists
  const currentPath = window.location.pathname;
  const pathSegments = currentPath.split('/').filter(Boolean);
  const locale = pathSegments.length > 0 ? pathSegments[0] : 'en';

  // Clean up path to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  return `${baseUrl}/${locale}/${cleanPath}`;
};

// Convenience functions for Supabase Auth
export const supabaseAuth = {
  /**
   * Sign in with email and password
   */
  signInWithPassword: async (email: string, password: string) => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  },

  /**
   * Sign up a new user
   */
  signUp: async (email: string, password: string) => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    });

    return { data, error };
  },

  /**
   * Sign in with OAuth provider
   */
  signInWithOAuth: async (provider: 'google' | 'github') => {
    const supabase = createBrowserSupabase();
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl('/auth/callback'),
        scopes: provider === 'github' ? 'repo,user' : 'email profile',
      },
    });
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Reset password with a recovery email
   */
  resetPassword: async (email: string) => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('/reset-password'),
    });

    return { data, error };
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },

  /**
   * Update user data
   */
  updateUser: async (attributes: { email?: string; password?: string; data?: any }) => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.updateUser(attributes);
    return { data, error };
  },
  
  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const supabase = createBrowserSupabase();
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabaseAuth;
