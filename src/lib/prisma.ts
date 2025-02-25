import { PrismaClient } from '@prisma/client';

// Use a single PrismaClient instance
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prismaclient-in-long-running-applications

// Initialize Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Check if we already have a Prisma instance in global
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// In development, attach the client to the global object
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 