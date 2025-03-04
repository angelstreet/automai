// src/app/lib/auth.ts
/**
 * ⚠️ CRITICAL WARNING ⚠️
 *
 * This file contains sensitive authentication configuration that works with the
 * internationalization middleware. Modifications to this file can break authentication
 * across all locales.
 *
 * IMPORTANT RULES:
 * 1. NEVER hardcode locales in page URLs (e.g., '/en/login')
 * 2. ALWAYS use paths without locale prefixes (e.g., '/login')
 * 3. Let the middleware handle locale detection and routing
 * 4. Test any changes with ALL supported locales
 *
 * See .cursor/rules/backend.mdc for detailed authentication guidelines.
 */
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcrypt';
import NextAuth from 'next-auth/next';
import type { Session, User } from 'next-auth';
import type { AuthOptions } from 'next-auth/core/types';
import type { JWT } from 'next-auth/jwt';
import { default as CredentialsProvider } from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

// Ensure environment variables are loaded
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('Warning: NEXTAUTH_SECRET is not set in your .env.development file');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Warning: Google provider credentials are missing in your .env.development file');
}

// Define our session and user types
interface CustomUser extends User {
  id: string;
  role?: string;
  tenantId?: string;
  tenantName?: string;
  password?: string;
}

interface CustomSession extends Session {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string;
    tenantId?: string;
    tenantName: string | null;
  };
  accessToken: string;
  expires: string;
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          const user = (await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              tenant: true,
            },
          })) as (CustomUser & { tenant: any }) | null;

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await compare(credentials.password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role || 'user',
            tenantId: user.tenantId || null,
            tenantName: user.tenant?.name || '',
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/error',
    signOut: '/login',
    newUser: '/auth-redirect',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', {
        user: { id: user.id, email: user.email },
        account: account ? { provider: account.provider } : null,
      });
      return true;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      console.log('Redirect callback:', { url, baseUrl });
  
      // Check if this is a callback from OAuth provider
      if (url.includes('/api/auth/callback/')) {
        console.log('OAuth callback detected, redirecting to auth-redirect');
        // Let the middleware handle locale detection and routing
        return `${baseUrl}/auth-redirect`;
      }
  
      // Remove route group notation if present
      if (url.includes('/(auth)')) {
        const cleanUrl = url.replace('/(auth)', '');
        console.log('Cleaned route group from URL:', { original: url, cleaned: cleanUrl });
        return cleanUrl;
      }
  
      // For other redirects, use the URL as is
      if (url.startsWith(baseUrl)) {
        return url;
      }
  
      // For relative URLs, append to baseUrl
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
  
      // Default fallback
      return url;
    },
    async jwt({ token, user, account }: { token: JWT; user: any; account: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.accessToken = account?.access_token;
      }
      return token;
    },
    async session({ session, token, user, trigger, newSession }) {
      const newSessionData = {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          tenantId: token.tenantId as string,
          tenantName: token.tenantName as string,
        },
        accessToken: token.accessToken as string,
      };
      return newSessionData as CustomSession;
    },
  },
  secret: env.NEXTAUTH_SECRET,
  debug: env.NODE_ENV === 'development',
};

// Export NextAuth as the default handler
export default NextAuth(authOptions);
