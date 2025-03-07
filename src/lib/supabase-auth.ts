/**
 * @deprecated - Please import directly from @/utils/supabase/client instead
 * This file is maintained for backward compatibility but should not be used in new code.
 */

// Import from the new standardized location
import { createClient, createSessionFromUrl } from '@/utils/supabase/client';
import { isDevelopment } from './env';

// Helper function to get the locale from URL
const getLocaleFromPath = (): string => {
  if (typeof window === 'undefined') return 'en';
  
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  return (pathParts.length > 0 && ['en', 'fr'].includes(pathParts[0])) ? pathParts[0] : 'en';
};

// Helper function to get redirect URL with locale
const getRedirectUrl = (path: string = '/auth-redirect'): string => {
  const locale = getLocaleFromPath();
  
  // Add locale to path if needed
  if (!path.startsWith('/en/') && !path.startsWith('/fr/')) {
    path = path === '/auth-redirect' ? `/${locale}/auth-redirect` : `/${locale}${path}`;
  }
  
  return `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}${path}`;
};

// Export the auth interface for backward compatibility
export const supabaseAuth = {
  signInWithPassword: async (email: string, password: string) => {
    const supabase = createClient();
    return await supabase.auth.signInWithPassword({ email, password });
  },
  
  signUp: async (email: string, password: string) => {
    const supabase = createClient();
    return await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getRedirectUrl() }
    });
  },
  
  signInWithOAuth: async (provider: 'google' | 'github') => {
    const supabase = createClient();
    const redirectUrl = getRedirectUrl();
    const isCodespace = typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev');
    
    return await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        scopes: provider === 'github' ? 'repo,user' : 'email profile',
        flowType: isCodespace ? 'implicit' : undefined
      }
    });
  },
  
  signOut: async () => {
    const supabase = createClient();
    return await supabase.auth.signOut();
  },
  
  resetPassword: async (email: string) => {
    const supabase = createClient();
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('?type=recovery')
    });
  },
  
  getSession: async () => {
    const supabase = createClient();
    return await supabase.auth.getSession();
  },
  
  processSessionFromUrl: async (url: string = window.location.href) => {
    return await createSessionFromUrl(url);
  },
  
  getUser: async () => {
    const supabase = createClient();
    return await supabase.auth.getUser();
  },
  
  updateUser: async (attributes: { email?: string; password?: string; data?: any }) => {
    const supabase = createClient();
    return await supabase.auth.updateUser(attributes);
  },
  
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const supabase = createClient();
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Log deprecation warning
console.warn(
  'Warning: imports from @/lib/supabase-auth.ts are deprecated. ' +
  'Please use @/utils/supabase/client imports directly.'
);

// Export a function that gets the supabaseAuth instance for backward compatibility
export default function getSupabaseAuth() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseAuth should only be called in browser environment');
  }
  return supabaseAuth;
}