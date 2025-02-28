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
    log: config.server.isDev ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });

// In development, attach the client to the global object
if (!config.server.isProd) globalForPrisma.prisma = prisma;
