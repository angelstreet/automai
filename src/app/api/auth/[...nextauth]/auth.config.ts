import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import jwt from 'jsonwebtoken';

export const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          const res = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            console.error('Login failed:', data);
            throw new Error(data.error || 'Failed to login');
          }

          if (!data.user || !data.token) {
            console.error('Invalid response:', data);
            throw new Error('Invalid response from authentication server');
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            tenantId: data.user.tenantId,
            tenantName: data.user.tenantName,
            plan: data.user.plan,
            accessToken: data.token,
          };
        } catch (error: any) {
          console.error('Auth error:', error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/error',
    signOut: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          console.log('Google sign in attempt:', {
            hasAccessToken: !!account.access_token,
            email: profile?.email,
            name: profile?.name,
          });

          // Exchange Google token for our backend token
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
          const response = await fetch(`${backendUrl}/api/auth/google/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: account.access_token,
              email: profile?.email,
              name: profile?.name,
            }),
          });

          if (!response.ok) {
            console.error('Failed to authenticate with backend:', response.statusText);
            return false;
          }

          const data = await response.json();

          // Ensure we have the correct tenant information
          if (!data.user.tenantName && data.user.tenant?.name) {
            data.user.tenantName = data.user.tenant.name;
          }

          // Update user object with all necessary data
          Object.assign(user, {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            tenantId: data.user.tenantId,
            tenantName: data.user.tenantName || data.user.tenant?.name,
            plan: data.user.plan,
            accessToken: data.token,
            image: profile?.image ?? null,
            emailVerified: new Date() // Set emailVerified to current date for OAuth users
          });

          console.log('Updated user data:', {
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            tenantName: user.tenantName,
            plan: user.plan,
          });

          return true;
        } catch (error) {
          console.error('Error in Google sign in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Update token with user data
        token = {
          ...token,
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenantName,
          plan: user.plan,
          accessToken: user.accessToken || account?.access_token,
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Update session with token data
      session.user = {
        ...session.user,
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        role: token.role as string,
        tenantId: token.tenantId as string,
        tenantName: token.tenantName as string,
        plan: token.plan as string,
      };
      // Set access token at session level
      session.accessToken = token.accessToken as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.includes('/error') || url.includes('/login')) {
        const localeMatch = url.match(/\/([a-z]{2})\//);
        const locale = localeMatch ? localeMatch[1] : 'en';

        const errorMatch = url.match(/error=([^&]*)/);
        const error = errorMatch ? `?error=${errorMatch[1]}` : '';

        return `${baseUrl}/${locale}/login${error}`;
      }

      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
