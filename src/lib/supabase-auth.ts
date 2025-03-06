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
const getRedirectUrl = (path: string = '/auth-redirect'): string => {
  // Log current URL if in browser for debugging
  if (typeof window !== 'undefined') {
    console.log('Current window location:', window.location.href);
  }
  
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
    // For auth-redirect, always use the localized version
    if (path === '/auth-redirect') {
      console.log(`Using localized auth-redirect: /${locale}/auth-redirect`);
      path = `/${locale}/auth-redirect`;
    } else {
      path = `/${locale}${path}`;
    }
  }
  
  console.log('Final redirect URL path:', path);
  
  // Detect if we're in a GitHub Codespace from client-side
  const isClientCodespace = 
    typeof window !== 'undefined' && 
    window.location.hostname.includes('.app.github.dev');
  
  // First, check if SUPABASE_AUTH_CALLBACK_URL is explicitly set in any environment
  if (process.env.SUPABASE_AUTH_CALLBACK_URL) {
    console.log('Using configured SUPABASE_AUTH_CALLBACK_URL:', process.env.SUPABASE_AUTH_CALLBACK_URL);
    return process.env.SUPABASE_AUTH_CALLBACK_URL;
  }

  // For Codespace environment, we need to handle auth differently
  // We're redirecting directly to /auth-redirect with implicit flow
  if (isClientCodespace || (process.env.CODESPACE && process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN)) {
    let codespaceUrl;
    if (isClientCodespace) {
      codespaceUrl = window.location.origin;
    } else {
      codespaceUrl = `https://${process.env.CODESPACE_NAME}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    }
    
    // Use auth-redirect page instead of the API callback for Codespaces
    // Make sure we use the correct format for the redirect URL
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
    
    try {
      // Check if we're in a GitHub Codespace
      const isCodespace = typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Get the current locale from the URL or default to 'en'
      let locale = 'en';
      if (typeof window !== 'undefined') {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0 && ['en', 'fr'].includes(pathParts[0])) {
          locale = pathParts[0];
        }
      }
      
      // For Codespace environment, ensure the redirect URL is one of the allowed URLs
      // specified in the Supabase config
      let redirectUrl;
      if (isCodespace) {
        // Use the root auth-redirect path for Codespace
        // This is specifically included in additional_redirect_urls in config.codespace.toml
        redirectUrl = `${origin}/auth-redirect`;
        console.log(`Using Codespace-specific redirect URL: ${redirectUrl}`);
      } else {
        // For non-Codespace environments, use the localized path
        redirectUrl = `${origin}/${locale}/auth-redirect`;
      }
      
      console.log(`Initiating ${provider} OAuth login with redirect to:`, redirectUrl);
      
      // Configure OAuth sign-in
      return await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          // Make sure scopes are specified
          scopes: provider === 'github' ? 'repo,user' : 'email profile',
          // For Codespaces, we're now always using implicit flow
          flowType: isCodespace ? 'implicit' : undefined,
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
      redirectTo: getRedirectUrl('?type=recovery'),
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
   * Process session from URL hash fragment
   */
  processSessionFromUrl: async () => {
    const supabase = getBrowserSupabase();
    // Use the getSession method to detect and process tokens in the URL 
    // This relies on the detectSessionInUrl option being enabled
    return await supabase.auth.getSession();
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
