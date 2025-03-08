import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseUrl, getSupabaseAnonKey, isCodespaceEnvironment } from './env';

// Cache the client instance to avoid creating multiple instances
// that lead to GoTrueClient warnings
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Creates a Supabase client for browser/client components
 * - Caches the client to prevent multiple instances
 * - Adds special handling for Codespaces environment
 */
export const createClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called in browser/client components');
  }
  
  // Return cached instance if available
  if (browserClientInstance) {
    return browserClientInstance;
  }
  
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  
  // Add extra options for Codespaces environment 
  const codespaceOptions = isCodespaceEnvironment() ? {
    auth: {
      flowType: 'implicit',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key: string) => {
          try {
            return localStorage.getItem(key);
          } catch (error) {
            console.error('Error getting item from localStorage:', error);
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            localStorage.setItem(key, value);
          } catch (error) {
            console.error('Error setting item in localStorage:', error);
          }
        },
        removeItem: (key: string) => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing item from localStorage:', error);
          }
        },
      },
    },
  } : {};
  
  // Create and cache the client
  browserClientInstance = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    codespaceOptions
  );
  
  return browserClientInstance;
};