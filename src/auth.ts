import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { JWT } from "next-auth/jwt";
import type { Session, AuthOptions } from "next-auth";

// Import provider configurations
import { getGoogleProvider } from './app/api/auth/[...nextauth]/providers/google';
import { getGithubProvider } from './app/api/auth/[...nextauth]/providers/github';
import { getCredentialsProvider } from './app/api/auth/[...nextauth]/providers/credentials';

// Custom interfaces for type safety
interface CustomUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  tenantName: string;
  accessToken?: string;
}

interface CustomToken extends JWT {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  tenantName: string;
  accessToken?: string;
}

interface CustomSession extends Session {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    tenantId: string;
    tenantName: string;
  };
  accessToken?: string;
}

// Load providers with health checking
async function loadProviders() {
  try {
    const [googleProvider, githubProvider, credentialsProvider] = await Promise.all([
      getGoogleProvider().catch(err => {
        console.error('Error loading Google provider:', err);
        return null;
      }),
      getGithubProvider().catch(err => {
        console.error('Error loading GitHub provider:', err);
        return null;
      }),
      getCredentialsProvider().catch(err => {
        console.error('Error loading Credentials provider:', err);
        return null;
      }),
    ]);

    const providers = [googleProvider, githubProvider, credentialsProvider]
      .filter((provider): provider is NonNullable<typeof provider> => !!provider);

    console.log(`Successfully loaded ${providers.length} providers`);

    if (providers.length === 0) {
      console.error('No authentication providers loaded successfully');
      throw new Error('Authentication provider initialization failed');
    }

    return providers;
  } catch (error) {
    console.error('Critical error loading providers:', error);
    throw error;
  }
}

export const authConfig: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/login',
    error: '/error',
    signOut: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || (() => {
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
  events: {
    signIn: async ({ user }) => {
      console.log(`User signed in: ${user.id}`);
    },
    signOut: async () => {
      console.log('User signed out');
    },
    session: async ({ session }) => {
      console.log(`Session accessed for user: ${(session as CustomSession).user.id}`);
    },
  },
  callbacks: {
    async jwt({ token, user, account }): Promise<CustomToken> {
      if (user) {
        const customUser = user as CustomUser;
        return {
          ...token,
          id: customUser.id,
          email: customUser.email,
          name: customUser.name,
          role: customUser.role,
          tenantId: customUser.tenantId,
          tenantName: customUser.tenantName,
          accessToken: customUser.accessToken || account?.access_token,
        };
      }
      return token as CustomToken;
    },
    async session({ session, token }): Promise<CustomSession> {
      return {
        ...session,
        user: {
          id: token.id as string,
          email: token.email as string,
          name: token.name || undefined,
          role: token.role as string,
          tenantId: token.tenantId as string,
          tenantName: token.tenantName as string,
        },
        accessToken: token.accessToken as string,
      };
    },
  },
  debug: process.env.NODE_ENV === 'development',
  trustHost: true,
};

// Initialize NextAuth with providers
const providers = await loadProviders();
const handler = NextAuth({
  ...authConfig,
  providers,
});

// Export the handler functions and utilities
export const { GET, POST } = handler;
export const { auth, signIn, signOut } = handler;