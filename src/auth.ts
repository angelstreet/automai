// src/app/lib/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";
import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";
import { env } from "@/lib/env";

// Import providers
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";

// Ensure environment variables are loaded
// Next.js automatically loads .env.development in development mode
// and .env.production in production mode
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("Warning: NEXTAUTH_SECRET is not set in your .env.development file");
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("Warning: Google provider credentials are missing in your .env.development file");
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
    tenantName?: string;
  };
  accessToken?: string;
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              tenant: true,
            },
          }) as (CustomUser & { tenant: any }) | null;
          
          if (!user || !user.password) {
            return null;
          }
          
          const isPasswordValid = await compare(credentials.password, user.password);
          if (!isPasswordValid) {
            return null;
          }
          
          return {
            id: user.id,
            email: user.email || "",
            name: user.name || "",
            role: user.role || "user",
            tenantId: user.tenantId || null,
            tenantName: user.tenant?.name || "",
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/error",
    signOut: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
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
    async session({ session, token }: { session: any; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
        session.accessToken = token.accessToken as string;
      }
      return session as CustomSession;
    },
  },
  secret: env.NEXTAUTH_SECRET,
  debug: env.NODE_ENV === "development",
};

// Export auth utilities
const handler = NextAuth(authOptions);
export const { auth, signIn, signOut } = handler;