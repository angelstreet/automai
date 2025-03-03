import { PrismaAdapter } from '@auth/prisma-adapter';
import type { AuthOptions } from 'next-auth';

import { prisma } from '@/lib/prisma';

// Import provider configurations from separate files
import { getCredentialsProvider } from './providers/credentials';
import { getGithubProvider } from './providers/github';
import { getGoogleProvider } from './providers/google';

export const authConfig: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/login',
    error: '/error',
    signOut: '/login',
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    (() => {
      console.warn('Using fallback secret - DO NOT USE IN PRODUCTION');
      return 'fallback-secret-do-not-use-in-production';
    })(),
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.accessToken = user.accessToken || account?.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = session.user || {};
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

// Dynamically load providers when needed
export async function getProviders() {
  try {
    console.log('Loading auth providers...');

    // Load each provider with error handling
    const googleProvider = await getGoogleProvider().catch((err) => {
      console.error('Error loading Google provider:', err);
      return null;
    });

    const githubProvider = await getGithubProvider().catch((err) => {
      console.error('Error loading GitHub provider:', err);
      return null;
    });

    const credentialsProvider = await getCredentialsProvider().catch((err) => {
      console.error('Error loading Credentials provider:', err);
      return null;
    });

    // Filter out any providers that failed to load
    const providers = [googleProvider, githubProvider, credentialsProvider].filter(Boolean);

    console.log(`Successfully loaded ${providers.length} providers`);

    // Ensure we have at least one provider
    if (providers.length === 0) {
      console.warn('No authentication providers loaded, adding fallback credentials provider');
      // Add a simple fallback provider to prevent complete auth failure
      const { default: CredentialsProvider } = await import('next-auth/providers/credentials');
      return [
        CredentialsProvider({
          id: 'fallback-credentials',
          name: 'Fallback Credentials',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize() {
            console.error('Using fallback provider - authentication will fail');
            return null; // Always fail auth with fallback
          },
        }),
      ];
    }

    return providers;
  } catch (error) {
    console.error('Error loading providers:', error);
    // Return empty array instead of throwing to prevent complete auth failure
    return [];
  }
}
