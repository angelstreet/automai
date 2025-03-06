import { createClient } from '@supabase/supabase-js';
import { isProduction, isDevelopment } from './env';

// Environment variables
const getSupabaseUrl = () => {
  if (isDevelopment()) {
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
let browserClient: ReturnType<typeof createClient> | null = null;

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
export function createBrowserSupabase() {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserSupabase should only be used in browser environment');
  }

  if (browserClient) return browserClient;

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  console.log(`Creating Supabase browser client for ${supabaseUrl}`);
  
  // Determine if we're in a Codespace environment from the URL
  const isCodespaceEnvironment = typeof window !== 'undefined' && 
    window.location.hostname.includes('.app.github.dev');
  
  // Create client with options configured for the environment
  const baseUrl = window.location.origin;
  
  // For debugging purposes, add an onAuthStateChange callback
  const handleAuthStateChange = (event: string, session: any) => {
    console.log('Supabase Auth State Change:', { 
      event, 
      hasSession: !!session,
      sessionUser: session?.user?.email || 'none',
      timestamp: new Date().toISOString()
    });
  };

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Add debugging to help diagnose auth issues
      debug: process.env.NODE_ENV === 'development',
      // Special handling for Codespace environments
      ...(isCodespaceEnvironment && {
        flowType: 'implicit',
        // This makes Supabase Auth work better with GitHub Codespaces
        // Enable for all environments since redirects may come from either
        storageKey: 'supabase.auth.token',
      }),
    },
  });
  
  // Add auth state change listener to help debug
  browserClient.auth.onAuthStateChange(handleAuthStateChange);

  // For TypeScript compatibility, create a wrapper on the original client
  const processSessionFromUrl = async () => {
    try {
      if (typeof window === 'undefined') return { data: { session: null }, error: new Error('No window object') };
      
      console.log('Processing session from URL hash');
      
      // If we have a hash with access_token, we need to manually handle it
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        console.log('Found hash fragment with access_token');
        
        // Use the browser client's built-in method to handle the hash
        // This will use the "detectSessionInUrl" option we enabled
        if (browserClient) {
          return await browserClient.auth.getSession();
        } else {
          return { data: { session: null }, error: new Error('Browser client not initialized') };
        }
      } else {
        return { data: { session: null }, error: new Error('No access token in URL') };
      }
    } catch (error: any) {
      console.error('Error getting session from URL:', error);
      return { data: { session: null }, error };
    }
  };

  // We won't modify the auth methods directly since it's causing issues
  // Instead, we'll make sure the client initializes correctly
  if (browserClient) {
    // Force the client to initialize properly before returning
    browserClient.auth.getSession().catch(err => {
      console.error('Error initializing Supabase client:', err);
    });
  }

  return browserClient;
}

// Default export for server-side use
const supabase = createServerSupabase();
export default supabase;
