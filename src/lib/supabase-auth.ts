// Client-side authentication helpers using the new Supabase client
import { createClient, createSessionFromUrl } from '@/utils/supabase/client';
import { isDevelopment } from './env';

/**
 * Helper function to determine production environment and get the appropriate redirect URL
 */
const getRedirectUrl = (path: string = '/auth-redirect'): string => {
  // Get the current locale from the URL or default to 'en'
  let locale = 'en';
  if (typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && ['en', 'fr'].includes(pathParts[0])) {
      locale = pathParts[0];
    }
  }

  // Modify path to include locale if it doesn't start with a locale
  if (!path.startsWith('/en/') && !path.startsWith('/fr/')) {
    if (path === '/auth-redirect') {
      path = `/${locale}/auth-redirect`;
    } else {
      path = `/${locale}${path}`;
    }
  }

  // Detect environment type
  const isCodespace = typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev');
  
  // For Codespace environment, use current origin
  if (isCodespace) {
    return `${window.location.origin}${path}`;
  }

  // In production, use the site URL
  if (process.env.NODE_ENV === 'production') {
    return `${process.env.NEXT_PUBLIC_SITE_URL}${path}`;
  }

  // For development, use the current origin
  return `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}${path}`;
};

// Convenience functions for Supabase Auth
export const supabaseAuth = {
  /**
   * Sign in with email and password
   */
  signInWithPassword: async (email: string, password: string) => {
    const supabase = createClient();
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  /**
   * Sign up a new user
   */
  signUp: async (email: string, password: string) => {
    const supabase = createClient();
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    });
  },

  /**
   * Sign in with OAuth provider
   */
  signInWithOAuth: async (provider: 'google' | 'github') => {
    const supabase = createClient();

    try {
      // Get the current locale from the URL
      let locale = 'en';
      if (typeof window !== 'undefined') {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0 && ['en', 'fr'].includes(pathParts[0])) {
          locale = pathParts[0];
        }
      }

      // Generate redirect URL with locale
      const redirectUrl = `${window.location.origin}/${locale}/auth-redirect`;
      
      // Detect environment
      const isCodespace = typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev');
      
      if (isDevelopment()) {
        console.log(`Initiating ${provider} OAuth login with redirect to:`, redirectUrl);
      }

      // Configure provider-specific options
      const providerOptions = provider === 'github' ? {
        queryParams: {
          environment: isCodespace ? 'codespace' : isDevelopment() ? 'development' : 'production',
        },
        scopes: 'repo,user',
        flowType: isCodespace ? 'implicit' : undefined,
      } : {
        queryParams: {
          environment: isCodespace ? 'codespace' : isDevelopment() ? 'development' : 'production'
        },
        scopes: 'email profile',
        flowType: isCodespace ? 'implicit' : undefined,
      };

      return await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          ...providerOptions
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
    const supabase = createClient();
    return await supabase.auth.signOut();
  },

  /**
   * Reset password with a recovery email
   */
  resetPassword: async (email: string) => {
    const supabase = createClient();
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('?type=recovery'),
    });
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    const supabase = createClient();
    return await supabase.auth.getSession();
  },

  /**
   * Process session from URL (for OAuth and magic link redirects)
   */
  processSessionFromUrl: async (url: string = window.location.href) => {
    if (typeof window === 'undefined') {
      throw new Error('processSessionFromUrl should only be called in browser environment');
    }
    
    return await createSessionFromUrl(url);
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    const supabase = createClient();
    return await supabase.auth.getUser();
  },

  /**
   * Update user data
   */
  updateUser: async (attributes: { email?: string; password?: string; data?: any }) => {
    const supabase = createClient();
    return await supabase.auth.updateUser(attributes);
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const supabase = createClient();
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Export a function that gets the supabaseAuth instance
export default function getSupabaseAuth() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseAuth should only be called in browser environment');
  }
  
  return supabaseAuth;
}