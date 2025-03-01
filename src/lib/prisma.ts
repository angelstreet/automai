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
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });

// Attempt to connect to the database and log any errors
async function testConnection() {
  try {
    console.log('Testing Prisma database connection...');
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful');
  } catch (error) {
    console.error('Failed to connect to database:', error);
  }
}

// Run the test in development mode
if (process.env.NODE_ENV === 'development') {
  testConnection();
}

// In development, attach the client to the global object
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
