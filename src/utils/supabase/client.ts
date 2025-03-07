import { createBrowserClient } from '@supabase/ssr';
import { isCodespace, isDevelopment } from '@/lib/env';

// Environment config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Singleton instance for browser
declare global {
  var __supabaseBrowserClient: ReturnType<typeof createBrowserClient> | undefined;
}

// Helper for Codespace URL detection and formatting
const getCodespaceUrl = () => {
  if (typeof window === 'undefined' || !window.location.hostname.includes('.app.github.dev')) {
    return SUPABASE_URL;
  }
  
  const hostnameBase = window.location.hostname.split('.')[0];
  const codespacePart = hostnameBase.match(/(.*?)(-\d+)?$/)?.[1] || hostnameBase;
  return `https://${codespacePart}-54321.app.github.dev`;
};

// Determine the correct cookie domain based on the environment
const getCookieDomain = (): string => {
  if (typeof window === 'undefined') return '';
  
  const hostname = window.location.hostname;
  
  // GitHub Codespaces: use github.dev domain
  if (hostname.includes('.app.github.dev')) {
    return '.app.github.dev';
  }
  
  // Vercel: handle both preview and production
  if (hostname.includes('.vercel.app')) {
    return '.vercel.app';
  }
  
  // Local development or other domains
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '';
  }
  
  // Production domain - extract the root domain
  // For example: dashboard.automai.io -> automai.io
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return `.${parts.slice(-2).join('.')}`;
  }
  
  return '';
};

export const createClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('Browser client should only be called in browser environment');
  }
  
  // If we already have a client instance, return it (singleton pattern)
  if (globalThis.__supabaseBrowserClient) {
    return globalThis.__supabaseBrowserClient;
  }

  // Determine the correct URL based on environment
  const url = isDevelopment() && window.location.hostname.includes('.app.github.dev') 
    ? getCodespaceUrl() 
    : SUPABASE_URL;

  const isCodespaceEnv = typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev');
  const cookieDomain = getCookieDomain();
  
  if (isDevelopment()) {
    console.log(`[Supabase] Creating browser client with URL: ${url}`);
    console.log(`[Supabase] Using cookie domain: ${cookieDomain || '(none)'}`);
  }
  
  // Create and store client instance
  // For browser clients, don't specify cookie methods - use browser's document.cookie API
  const client = createBrowserClient(url, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: isCodespaceEnv ? 'implicit' : 'pkce',
      debug: isDevelopment(),
      // Add cookie options but not the methods
      cookieOptions: {
        name: 'sb-auth',
        lifetime: 60 * 60 * 24 * 7, // 7 days
        domain: cookieDomain,
        path: '/',
        sameSite: 'lax',
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-browser/2.38.4',
      }
    }
  });
  
  // Store in global for singleton pattern
  globalThis.__supabaseBrowserClient = client;
  
  return client;
};

// Helper to create a session from URL hash parameters (for auth redirects)
export const createSessionFromUrl = async (url: string) => {
  if (typeof window === 'undefined') {
    throw new Error('createSessionFromUrl should only be called in browser environment');
  }

  try {
    const client = createClient();
    
    // Parse URL to extract hash parameters
    const hashParams = new URLSearchParams(url.includes('#') ? url.split('#')[1] : '');
    
    // Get the tokens
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    if (!accessToken) {
      return { data: { session: null }, error: new Error('No access token found in URL') };
    }
    
    // Set the session
    return await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });
  } catch (error) {
    console.error('Error creating session from URL:', error);
    return { data: { session: null }, error };
  }
};