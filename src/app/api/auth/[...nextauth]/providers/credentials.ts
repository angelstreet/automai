// Dynamically import the provider to reduce initial load time
import { prisma } from '@/lib/prisma';

export async function getCredentialsProvider() {
  const CredentialsProvider = (await import('next-auth/providers/credentials')).default;
  const bcrypt = await import('bcrypt');
  const jwt = await import('jsonwebtoken');
  
  return CredentialsProvider({
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
        // Find user by email
        const user = await prisma.user.findUnique({
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
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
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
            tenantId: user.tenantId
          },
          process.env.JWT_SECRET || 'fallback-jwt-secret',
          { expiresIn: '24h' }
        );
        
        // Return user data
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