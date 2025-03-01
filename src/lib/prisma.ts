import { PrismaClient } from '@prisma/client';

import { config } from './config';

// Use a single PrismaClient instance
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prismaclient-in-long-running-applications

// Initialize Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Check if we already have a Prisma instance in global
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    datasources: {
      db: {
        url: config.database.url,
      },
    }
  });

// Test connection only once at startup
if (!globalForPrisma.prisma) {
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

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
