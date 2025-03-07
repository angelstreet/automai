import { createBrowserClient } from '@supabase/ssr';
import { isCodespace, isDevelopment } from '@/lib/env';

// CORS headers for Supabase auth requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Origin': 'https://vigilant-spork-q667vwj94c9x55-3000.app.github.dev',
};

// Environment config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// For debugging
console.log('[Supabase] Environment SUPABASE_URL:', SUPABASE_URL);

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
  
  // Always log in development and also in production for debugging this issue
  console.log(`[Supabase] Creating browser client with URL: ${url}`);
  console.log(`[Supabase] Using cookie domain: ${cookieDomain || '(none)'}`);
  console.log(`[Supabase] Auth flow type: ${isCodespaceEnv ? 'implicit' : 'pkce'}`);
  console.log(`[Supabase] isDevelopment: ${isDevelopment()}`);
  console.log(`[Supabase] Hostname: ${window.location.hostname}`);
  
  // Configure auth options based on environment
  const authOptions = {
    autoRefreshToken: true,
    persistSession: true,
    // Never detect session in URL to prevent automatic PKCE flow
    detectSessionInUrl: false,
    // Always enable debug for troubleshooting
    debug: true,
    // Always use implicit flow for Codespaces to avoid CORS issues
    flowType: 'implicit', // Force implicit flow for all environments in Codespaces
    // Configure cookies
    cookieOptions: {
      name: 'sb-auth',
      lifetime: 60 * 60 * 24 * 7, // 7 days
      domain: cookieDomain,
      path: '/',
      sameSite: 'lax',
    }
  };
  
  // Log the configuration
  console.log(`[Supabase] Auth flow type FORCED to: ${authOptions.flowType}`);
  console.log('[Supabase] detectSessionInUrl DISABLED to prevent PKCE flow');
  
  // For non-Codespaces environments, revert to PKCE flow
  if (!isCodespaceEnv) {
    authOptions.flowType = 'pkce';
    authOptions.detectSessionInUrl = true;
    console.log('[Supabase] Non-Codespace environment, reverting to PKCE flow');
  } else {
    console.log('[Supabase] Codespace environment detected, using implicit flow');
  }
  
  // Create and store client instance
  const client = createBrowserClient(url, SUPABASE_ANON_KEY, {
    auth: authOptions,
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
export const exchangeCodeForSession = async (code: string) => {
  if (typeof window === 'undefined') {
    throw new Error('exchangeCodeForSession should only be called in browser environment');
  }

  try {
    const client = createClient();
    
    // Try the built-in method first
    try {
      // Add debug log for tracking
      console.log(`Attempting to exchange code for session with client URL: ${client.auth.url}`);
      return await client.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error('Error using built-in exchangeCodeForSession:', error);
      
      // For GitHub Codespaces, we need a solution that avoids CORS
      // Use a route on our Next.js server to proxy the request
      try {
        console.log('Attempting to use Next.js API proxy for token exchange');
        
        // Call our own API endpoint which will handle the token exchange server-side
        const proxyUrl = '/api/auth/token-exchange';
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            code, 
            supabaseUrl: client.auth.url,
            apiKey: client.supabaseKey
          })
        });
        
        if (!response.ok) {
          console.error('Proxy token exchange failed:', await response.text());
          throw new Error(`Proxy token exchange failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Proxy token exchange response:', { hasAccessToken: !!data.access_token });
        
        // Format the response to match Supabase's expected format
        if (data.access_token) {
          // Set the session using the tokens we received
          return await client.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token || '',
          });
        }
        
        throw new Error('No access token in proxy response');
      } catch (proxyError) {
        console.error('Proxy token exchange failed:', proxyError);
        
        // Last resort - try direct fetch with all possible CORS workarounds
        console.log('Attempting final direct token exchange');
        const endpoint = `${client.auth.url}/token?grant_type=pkce&code=${code}`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'apikey': client.supabaseKey,
            'X-Client-Info': 'supabase-js-browser/2.38.4',
            ...corsHeaders
          }
        });
        
        if (!response.ok) {
          throw new Error(`Direct token exchange failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Direct token exchange response:', { hasAccessToken: !!data.access_token });
        
        if (data.access_token) {
          return await client.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token || '',
          });
        }
        
        throw new Error('No access token in direct response');
      }
    }
  } catch (error) {
    console.error('Error exchanging code for session:', error);
    return { data: { session: null }, error };
  }
};

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
    
    // Check for code in URL parameters (for PKCE flow)
    const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const code = urlParams.get('code');
    
    if (accessToken) {
      // Set the session using hash fragment tokens
      return await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
    } else if (code) {
      // Exchange the code for a session
      return await exchangeCodeForSession(code);
    }
    
    return { data: { session: null }, error: new Error('No access token or code found in URL') };
  } catch (error) {
    console.error('Error creating session from URL:', error);
    return { data: { session: null }, error };
  }
};