// Dynamically import the provider to reduce initial load time
export async function getCredentialsProvider() {
  const CredentialsProvider = (await import('next-auth/providers/credentials')).default;
  
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
        // Use internal API instead of external server
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const bcrypt = await import('bcrypt');
        
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
            await prisma.$disconnect();
            return null;
          }
          
          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordValid) {
            console.error('Invalid password for user:', credentials.email);
            await prisma.$disconnect();
            return null;
          }
          
          // Generate JWT token
          const jwt = await import('jsonwebtoken');
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
          
          await prisma.$disconnect();
          
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
        } catch (dbError) {
          console.error('Database error:', dbError);
          await prisma.$disconnect();
          throw new Error('Database error during authentication');
        }
      } catch (error: any) {
        console.error('Auth error:', error);
        throw error;
      }
    },
  });
} 