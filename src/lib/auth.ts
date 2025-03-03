import { compare } from 'bcrypt';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { DefaultSession } from 'next-auth/core/types';

// Remove direct import of CredentialsProvider
// import CredentialsProvider from 'next-auth/providers/credentials';
import { logger } from './logger';
import { prisma } from './prisma';

// Extend next-auth types
interface ExtendedUser extends User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
}

interface ExtendedSession extends Session {
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    tenantName: string;
  } & DefaultSession['user'];
}

// Create a function to get the auth options with dynamically loaded providers
export async function getAuthOptions() {
  // Dynamically import the provider
  const CredentialsProvider = (await import('next-auth/providers/credentials')).default;

  return {
    session: {
      strategy: 'jwt',
    },
    pages: {
      signIn: '/login',
    },
    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Missing credentials', {
              action: 'AUTH_MISSING_CREDENTIALS',
            });
            return null;
          }

          try {
            // Find user by email
            const user = await prisma.user.findUnique({
              where: { email: credentials.email },
              include: {
                tenant: true,
              },
            });

            if (!user || !user.password) {
              logger.warn('User not found', {
                action: 'AUTH_USER_NOT_FOUND',
                data: { email: credentials.email },
              });
              return null;
            }

            // Verify password
            const isValid = await compare(credentials.password, user.password);

            if (!isValid) {
              logger.warn('Invalid password', {
                action: 'AUTH_INVALID_PASSWORD',
                data: { email: credentials.email },
              });
              return null;
            }

            logger.info('User authenticated successfully', {
              userId: user.id,
              tenantId: user.tenantId || undefined,
              action: 'AUTH_SUCCESS',
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              tenantId: user.tenantId || '',
              tenantName: user.tenant?.name || 'Unknown Tenant',
            };
          } catch (error) {
            logger.error(`Auth error: ${error instanceof Error ? error.message : String(error)}`, {
              action: 'AUTHerror',
              data: { error: error instanceof Error ? error.message : String(error) },
            });
            return null;
          }
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }: { token: JWT; user?: ExtendedUser }) {
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.role = user.role;
          token.tenantId = user.tenantId;
          token.tenantName = user.tenantName;
        }
        return token;
      },
      async session({ session, token }: { session: ExtendedSession; token: JWT }) {
        if (token) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.role = token.role as string;
          session.user.tenantId = token.tenantId as string;
          session.user.tenantName = token.tenantName as string;
        }
        return session;
      },
    },
  } as const;
}

// For backward compatibility, export a static version
export const authOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: ExtendedUser }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
      }
      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: JWT }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
      }
      return session;
    },
  },
} as const;
