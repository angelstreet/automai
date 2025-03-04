import { PrismaAdapter } from '@auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import type { User } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Define custom types
interface CustomUser extends User {
  id: string;
  role?: string;
  tenantId?: string;
  tenantName?: string;
}

// Declare module augmentation
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: string;
      tenantId?: string | null;
      tenantName: string | null;
      plan?: string;
      accessToken?: string;
    };
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    tenantId?: string;
    tenantName?: string;
    accessToken?: string;
  }
}

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [], // Will be dynamically loaded
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
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }: { token: any; user: any; account: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as CustomUser).role;
        token.tenantId = (user as CustomUser).tenantId;
        token.tenantName = (user as CustomUser).tenantName;
        token.accessToken = account?.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          role: token.role as string,
          tenantId: token.tenantId as string,
          tenantName: token.tenantName as string,
        };
        session.accessToken = token.accessToken;
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

    // Import providers dynamically
    const { default: GoogleProvider } = await import('next-auth/providers/google');
    const { default: GitHubProvider } = await import('next-auth/providers/github');
    const { default: CredentialsProvider } = await import('next-auth/providers/credentials');

    // Create provider instances
    const providers = [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      }),
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      }),
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials: any) {
          // Add your authorization logic here
          return null;
        },
      }),
    ];

    return providers;
  } catch (error) {
    console.error('Error loading providers:', error);
    return [];
  }
}
