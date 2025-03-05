// Dynamically import the provider to reduce initial load time
import db from '@/lib/db';
import type { AdapterUser } from 'next-auth/adapters';

// Define user type
interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  tenantId: string | null;
  tenantName: string;
  plan: string;
  accessToken: string;
}

// Define credentials type
interface Credentials {
  email: string;
  password: string;
}

export async function getCredentialsProvider() {
  const { default: CredentialsProvider } = await import('next-auth/providers/credentials');
  const bcrypt = await import('bcrypt');
  const jwt = await import('jsonwebtoken');

  return CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(
      credentials: Record<keyof Credentials, string> | undefined,
    ): Promise<AuthUser | null> {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Email and password are required');
      }

      try {
        // Find user by email with type safety
        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            tenant: true,
          },
        });

        // Check if user exists
        if (!user) {
          console.error('User not found:', credentials.email);
          return null;
        }

        // Verify password - assuming password is a required field in Prisma schema
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password ?? '');
        if (!isPasswordValid) {
          console.error('Invalid password for user:', credentials.email);
          return null;
        }

        // Generate JWT token
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          process.env.JWT_SECRET || 'fallback-jwt-secret',
          { expiresIn: '24h' },
        );

        // Return user data with proper typing
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name || '',
          plan: user.tenant?.plan || 'free',
          accessToken: token,
        };
      } catch (error: any) {
        console.error('Auth error:', error);
        throw error;
      }
    },
  });
}
