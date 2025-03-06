import { createBrowserSupabase } from './supabase';

/**
 * Helper function to determine production environment and get the appropriate redirect URL
 * Adds locale to the redirect path for proper routing
 */
const getRedirectUrl = (path: string = '/auth-redirect'): string => {
  const isProd = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1');
  
  // Get the current locale from the URL path
  const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
  const locale = pathParts.length > 0 ? pathParts[0] : 'en';
  
  // Add locale to the path
  const localizedPath = path.startsWith('/') ? `/${locale}${path}` : `/${locale}/${path}`;
  
  // In production, use the Vercel deployment URL regardless of current origin
  return isProd 
    ? `https://automai-eta.vercel.app${localizedPath}`
    : `${window.location.origin}${localizedPath}`;
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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl(),
        scopes: provider === 'github' ? 'repo,user' : 'email profile',
      },
    });

    return { data, error };
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
