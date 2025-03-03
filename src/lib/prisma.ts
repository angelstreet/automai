import { PrismaClient } from '@prisma/client';

// Use a single PrismaClient instance
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prismaclient-in-long-running-applications

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

// Test connection only once at startup
let isInitialized = false;
if (!isInitialized) {
  isInitialized = true;
  (async () => {
    try {
      console.log('Testing initial Prisma database connection...');
      await prisma.$queryRaw`SELECT 1`;
      console.log('Initial database connection successful');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      process.exit(1); // Exit if we can't connect to database
    }
  })();
}

// Assign the PrismaClient instance to the global object in non-production environments
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
