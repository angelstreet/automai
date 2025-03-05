import { isUsingSupabase } from '@/lib/env';
import CredentialsProvider from 'next-auth/providers/credentials';

// Dynamically import supabaseAuthService to prevent errors when Supabase isn't available
let supabaseAuthService: any;
try {
  const supabaseAuth = require('@/lib/services/supabase-auth');
  supabaseAuthService = supabaseAuth.supabaseAuthService;
} catch (error) {
  console.warn('Supabase auth service not available');
  supabaseAuthService = {
    signInWithEmail: () => ({ success: false, error: 'Supabase auth service not available' })
  };
}

/**
 * Supabase authentication provider for NextAuth
 * Only used in production when Supabase is configured
 */
export const SupabaseProvider = () => {
  return CredentialsProvider({
    id: 'supabase',
    name: 'Supabase',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Email and password are required');
      }

      if (!isUsingSupabase()) {
        // When not in production or Supabase not configured, don't use this provider
        return null;
      }

      try {
        // Attempt to sign in with Supabase
        const result = await supabaseAuthService.signInWithEmail(
          credentials.email,
          credentials.password
        );

        if (!result.success || !result.data?.user) {
          console.error('Supabase authentication failed:', result.error);
          return null;
        }

        const { user } = result.data;

        // Return the user object in the format NextAuth expects
        return {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          image: user.user_metadata?.avatar_url,
          role: user.user_metadata?.role || 'user',
          tenantId: user.user_metadata?.tenantId,
          tenantName: user.user_metadata?.tenantName || 'trial',
        };
      } catch (error) {
        console.error('Error in Supabase auth provider:', error);
        return null;
      }
    }
  });
};