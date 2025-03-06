import { createBrowserSupabase } from './supabase';

let browserSupabase: any = null;

const getBrowserSupabase = () => {
  if (!browserSupabase) {
    browserSupabase = createBrowserSupabase();
  }
  return browserSupabase;
};

/**
 * Helper function to determine production environment and get the appropriate redirect URL
 * Handles all OAuth redirects consistently across environments
 */
const getRedirectUrl = (path: string = '/api/auth/callback'): string => {
  // First, check if SUPABASE_AUTH_CALLBACK_URL is explicitly set in any environment
  if (process.env.SUPABASE_AUTH_CALLBACK_URL) {
    console.log('Using configured SUPABASE_AUTH_CALLBACK_URL:', process.env.SUPABASE_AUTH_CALLBACK_URL);
    return process.env.SUPABASE_AUTH_CALLBACK_URL;
  }

  // Check for Codespace environment
  if (process.env.CODESPACE && process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
    const codespaceUrl = `https://${process.env.CODESPACE_NAME}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    console.log('Using Codespace URL for redirect:', `${codespaceUrl}${path}`);
    return `${codespaceUrl}${path}`;
  }
  
  // In production, use the site URL
  if (process.env.NODE_ENV === 'production') {
    return `${process.env.NEXT_PUBLIC_SITE_URL}${path}`;
  }

  // For development on server side
  if (typeof window === 'undefined') {
    return `http://localhost:3000${path}`;
  }

  // For development on client side, use the current origin
  const baseUrl = window.location.origin;
  return `${baseUrl}${path}`;
};

// Log the redirect URL on client-side initialization
if (typeof window !== 'undefined') {
  console.log('OAuth redirect URL configured as:', getRedirectUrl());
}

// Convenience functions for Supabase Auth
export const supabaseAuth = {
  /**
   * Sign in with email and password
   */
  signInWithPassword: async (email: string, password: string) => {
    const supabase = getBrowserSupabase();
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
    const supabase = getBrowserSupabase();
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
    const supabase = getBrowserSupabase();
    
    console.log(`Initiating ${provider} OAuth login with redirect to:`, getRedirectUrl());
    
    try {
      return await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl(),
          scopes: provider === 'github' ? 'repo,user' : 'email profile',
        },
      });
    } catch (error) {
      console.error(`Error during ${provider} OAuth:`, error);
      throw error;
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Reset password with a recovery email
   */
  resetPassword: async (email: string) => {
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('/api/auth/callback?type=recovery'),
    });

    return { data, error };
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },

  /**
   * Update user data
   */
  updateUser: async (attributes: { email?: string; password?: string; data?: any }) => {
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase.auth.updateUser(attributes);
    return { data, error };
  },
  
  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const supabase = getBrowserSupabase();
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabaseAuth;
