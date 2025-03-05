import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
declare global {
  var prisma: PrismaClient | undefined;
}

// Determine if we should use Supabase in production
const useSupabase = process.env.NODE_ENV === 'production';

// Initialize the Prisma client with appropriate logging based on environment
const prismaOptions = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
};

// The DATABASE_URL environment variable is set differently based on the ENV_FILE:
// - In .env.development: Points to local PostgreSQL
// - In .env.production: Points to Supabase PostgreSQL

// Create a singleton instance of PrismaClient
export const prisma = global.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
