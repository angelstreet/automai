import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from 'jsonwebtoken';

export const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account"
        }
      }
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
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
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
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
            plan: data.user.plan,
            accessToken: data.token
          };
        } catch (error: any) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          console.log('Google sign in attempt:', {
            hasAccessToken: !!account.access_token,
            email: profile?.email,
            name: profile?.name
          });

          // Exchange Google token for our backend token
          const response = await fetch('http://localhost:5001/api/auth/google/token', {
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

          const responseText = await response.text();
          console.log('Token exchange response:', {
            status: response.status,
            ok: response.ok,
            body: responseText
          });

          if (!response.ok) {
            throw new Error(`Failed to exchange token: ${responseText}`);
          }

          const data = JSON.parse(responseText);
          user.accessToken = data.token;
          user.id = data.user.id;
          user.role = data.user.role;
          user.tenantId = data.user.tenantId;
          user.plan = data.user.plan;
          user.image = profile?.picture || profile?.image;
          return true;
        } catch (error) {
          console.error('Detailed error in Google sign in:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Initial sign in
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = (user.image || account?.picture) as string | null;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.plan = user.plan;
        token.accessToken = user.accessToken || account?.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.accessToken = token.accessToken as string;
        // Add custom fields
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).tenantName = token.tenantName;
        (session.user as any).plan = token.plan;
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development',
}; 