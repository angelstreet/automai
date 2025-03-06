import { createClient } from '@supabase/supabase-js';
import { isProduction, isDevelopment } from './env';

// Environment variables
const getSupabaseUrl = () => {
  if (isDevelopment()) {
    // IMPORTANT: For GitHub Codespaces running local Supabase, we need to handle tokens properly
    // When in Codespaces, the token's 'iss' is based on the public URL
    if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
      const hostname = window.location.hostname;
      // Extract just the codespace project name without any port numbers
      // For example, from "vigilant-spork-q667vwj94c9x55-3001" we want just "vigilant-spork-q667vwj94c9x55"
      const hostnameBase = hostname.split('.')[0]; // e.g., "vigilant-spork-q667vwj94c9x55-3001"
      
      // Find where the codespace ID ends and any port begins
      let codespacePart = hostnameBase;
      // Look for the last hyphen followed by just numbers (port indicator)
      const portMatch = hostnameBase.match(/(.*?)(-\d+)$/);
      if (portMatch && portMatch[1]) {
        codespacePart = portMatch[1]; // Just the base name without port
        console.log(`Detected Codespace base name: ${codespacePart} (removed port from ${hostnameBase})`);
      }
      
      // Construct the Supabase URL to match the public one used in redirects
      // Always use the -54321 suffix for Supabase
      return `https://${codespacePart}-54321.app.github.dev`;
    }
    return process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
};

const getSupabaseAnonKey = () => {
  if (isDevelopment()) {
    return (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    );
  }
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
};

const getSupabaseServiceKey = () => {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
};

// Cache the client to avoid creating multiple instances
let serverClient: ReturnType<typeof createClient> | null = null;
let browserClient: any = null; // Using 'any' to avoid complex TS generics issues

// Type for a Supabase client with our custom extension
type ExtendedSupabaseClient = ReturnType<typeof createClient> & {
  auth: ReturnType<typeof createClient>['auth'] & {
    createSessionFromUrl: (url: string) => Promise<{
      data: { session: any },
      error: any
    }>
  }
};

// Server-side client with service role when available
export function createServerSupabase() {
  if (serverClient) return serverClient;

  const supabaseUrl = getSupabaseUrl();
  const key = getSupabaseServiceKey() || getSupabaseAnonKey();

  console.log(`Creating Supabase server client for ${supabaseUrl}`);
  serverClient = createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });

  return serverClient;
}

// Client-side client with improved options for Codespaces environments
export function createBrowserSupabase(): ExtendedSupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserSupabase should only be used in browser environment');
  }

  if (browserClient) return browserClient as ExtendedSupabaseClient;

  // IMPORTANT FIX: For GitHub Codespaces, we need to use 127.0.0.1 as the URL
  // This is because Supabase tokens are issued with 'iss' set to http://127.0.0.1:54321/auth/v1
  // When running in GitHub Codespaces, this causes token validation errors
  let supabaseUrl = getSupabaseUrl();
  
  // Explicitly check for Codespace environment to ensure consistency
  const isCodespaceEnvironment = typeof window !== 'undefined' && 
    window.location.hostname.includes('.app.github.dev');
    
  if (isCodespaceEnvironment) {
    // For Codespaces, we need to use the public URL for authentication
    // It should match the URL used in the Supabase redirect configuration
    const hostname = window.location.hostname;
    // Extract just the codespace project name without any port numbers
    // For example, from "vigilant-spork-q667vwj94c9x55-3001" we want just "vigilant-spork-q667vwj94c9x55"
    const hostnameBase = hostname.split('.')[0]; // e.g., "vigilant-spork-q667vwj94c9x55-3001"
    
    // Find where the codespace ID ends and any port begins
    let codespacePart = hostnameBase;
    // Look for the last hyphen followed by just numbers (port indicator)
    const portMatch = hostnameBase.match(/(.*?)(-\d+)$/);
    if (portMatch && portMatch[1]) {
      codespacePart = portMatch[1]; // Just the base name without port
      console.log(`Detected Codespace base name: ${codespacePart} (removed port from ${hostnameBase})`);
    }
    
    // Construct the Supabase URL to match what's in the Supabase redirect config
    // NOTE: Always use -54321 suffix for Supabase service, regardless of app port
    supabaseUrl = `https://${codespacePart}-54321.app.github.dev`;
    console.log('Codespace environment detected, using public URL:', supabaseUrl);
  }
  
  // Log the URL being used
  console.log(`Creating Supabase browser client for ${supabaseUrl}`);
  
  const supabaseAnonKey = getSupabaseAnonKey();
  
  // Create client with options configured for the environment
  const baseUrl = window.location.origin;
  
  // For debugging purposes, add an onAuthStateChange callback
  const handleAuthStateChange = (event: string, session: any): void => {
    console.log('Supabase Auth State Change:', { 
      event, 
      hasSession: !!session,
      sessionUser: session?.user?.email || 'none',
      timestamp: new Date().toISOString()
    });
  };

  // Create a new Supabase client instance
  const newClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Debug auth issues
      debug: isDevelopment(),
      // CRITICAL: For Codespace environments, enable localStorage persistence
      // and use 'implicit' flow
      ...(isCodespaceEnvironment && {
        flowType: 'implicit',
        storage: {
          getItem: (key) => {
            try {
              return localStorage.getItem(key);
            } catch (error) {
              console.error('Error getting item from localStorage:', error);
              return null;
            }
          },
          setItem: (key, value) => {
            try {
              localStorage.setItem(key, value);
            } catch (error) {
              console.error('Error setting item in localStorage:', error);
            }
          },
          removeItem: (key) => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              console.error('Error removing item from localStorage:', error);
            }
          },
        },
      }),
    },
  });
  
  // Assign the new client to our cached variable
  browserClient = newClient;
  
  // Add auth state change listener to help debug
  browserClient.auth.onAuthStateChange(handleAuthStateChange);

  // Add a special helper method to create a session from token parameters
  // This is useful for handling GitHub auth redirects with tokens in the URL
  // Add our custom method to the auth client
  (browserClient as ExtendedSupabaseClient).auth.createSessionFromUrl = async (url: string) => {
    try {
      // Parse URL to extract hash parameters
      const hashParams = new URLSearchParams(
        url.includes('#') ? url.split('#')[1] : ''
      );
      
      // Get the tokens
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (!accessToken) {
        return { data: { session: null }, error: new Error('No access token found in URL') };
      }
      
      console.log('Setting session with token (first few chars):', accessToken.substring(0, 10) + '...');
      
      // Set the session with enhanced error handling
      try {
        const response = await browserClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        console.log('Session set successfully:', !!response.data.session);
        return response;
      } catch (sessionError: any) {
        console.error('Error setting session:', {
          errorMessage: sessionError.message,
          errorName: sessionError.name,
          errorStack: sessionError.stack ? sessionError.stack.split('\n')[0] : 'No stack trace',
          errorType: typeof sessionError,
          url: window.location.href,
          hasHash: !!window.location.hash
        });
        
        // Try to get an existing session as fallback
        console.log('Trying to get existing session as fallback...');
        const existingSession = await browserClient.auth.getSession();
        if (existingSession.data.session) {
          console.log('Found existing valid session, using that instead');
          return existingSession;
        }
        
        return { data: { session: null }, error: sessionError };
      }
    } catch (error: any) {
      console.error('Error creating session from URL:', error);
      return { data: { session: null }, error };
    }
  };

  // We won't modify the auth methods directly since it's causing issues
  // Instead, we'll make sure the client initializes correctly
  // At this point, browserClient must exist since we assigned it above
  if (!browserClient) {
    // This should never happen, but TypeScript doesn't know that
    throw new Error('Failed to create Supabase client');
  }
  
  // Force the client to initialize properly before returning
  browserClient.auth.getSession().catch((err: any) => {
    console.error('Error initializing Supabase client:', err);
  });

  // Now we're sure browserClient is initialized, so we can return it
  return browserClient as ExtendedSupabaseClient;
}

// Default export for server-side use
const supabase = createServerSupabase();
export default supabase;