import { PrismaClient } from '@prisma/client';
import { isProduction, isUsingSupabase } from './env';
import { testSupabaseConnection, supabaseData } from './services/supabase-data';

// Use a single PrismaClient instance
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prismaclient-in-long-running-applications

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In production with Supabase, we create a modified Prisma client that will skip 
// actual database connection but provide expected interface
export const prisma = (() => {
  // If we're in production and using Supabase, create a stub client
  if (isProduction() && isUsingSupabase()) {
    console.log('Using Supabase in production - creating stub client (DATABASE FUNCTIONALITY LIMITED)');
    console.log('WARNING: Complete migration from Prisma to Supabase is required for full functionality');
    console.log('Schema migration script needs to be run to create matching tables in Supabase');
    
    // This is a stub implementation with limited functionality
    const supabaseStubClient = {
      // Add basic stub methods for common Prisma operations
      $queryRaw: async () => {
        console.log('$queryRaw called in Supabase mode - this operation is not supported');
        return [];
      },
      $connect: async () => {
        console.log('$connect called in Supabase mode - testing connection');
        return await testSupabaseConnection();
      },
      $disconnect: async () => {
        console.log('$disconnect called in Supabase mode - this is a no-op');
        return;
      },
      // Basic table stubs - these likely operate on non-existent tables until migration is complete
      user: {
        findMany: async (args: any = {}) => {
          console.log('WARNING: Attempting user.findMany() - table may not exist in Supabase yet');
          try {
            return await supabaseData.findMany('users', args);
          } catch (err) {
            console.error('Error in user.findMany():', err);
            return [];
          }
        },
        findUnique: async (args: any) => {
          console.log('WARNING: Attempting user.findUnique() - table may not exist in Supabase yet');
          if (!args?.where) return null;
          try {
            return await supabaseData.findUnique('users', args.where);
          } catch (err) {
            console.error('Error in user.findUnique():', err);
            return null;
          }
        },
        create: async (args: any) => {
          console.log('WARNING: Attempting user.create() - table may not exist in Supabase yet');
          if (!args?.data) return {};
          try {
            return await supabaseData.create('users', args.data);
          } catch (err) {
            console.error('Error in user.create():', err);
            return {};
          }
        },
        update: async (args: any) => {
          console.log('WARNING: Attempting user.update() - table may not exist in Supabase yet');
          if (!args?.where || !args?.data) return {};
          try {
            return await supabaseData.update('users', args.where, args.data);
          } catch (err) {
            console.error('Error in user.update():', err);
            return {};
          }
        },
        delete: async (args: any) => {
          console.log('WARNING: Attempting user.delete() - table may not exist in Supabase yet');
          if (!args?.where) return {};
          try {
            return await supabaseData.delete('users', args.where);
          } catch (err) {
            console.error('Error in user.delete():', err);
            return {};
          }
        }
      },
      // Other models need similar implementations for all Prisma models
    } as unknown as PrismaClient;
    
    return supabaseStubClient;
  }
  
  // Otherwise, use the real Prisma client
  return globalForPrisma.prisma ||
    new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
})();

// Test connection only once at startup
let isInitialized = false;
if (!isInitialized) {
  isInitialized = true;
  (async () => {
    try {
      // Test appropriate connection based on environment
      if (isProduction() && isUsingSupabase()) {
        console.log('Testing Supabase connection in production mode...');
        const success = await testSupabaseConnection();
        if (!success) {
          console.warn('Failed to connect to Supabase database, but continuing anyway');
          console.warn('NOTE: This is expected until you complete the Prisma to Supabase migration');
          console.warn('To complete migration, you need to:');
          console.warn('1. Export schema from Prisma to SQL (npx prisma migrate diff)');
          console.warn('2. Create matching tables in Supabase');
          console.warn('3. Adapt the data operations to use Supabase APIs');
          // Don't exit in production as we might want to serve static content
        }
      } else {
        console.log('Testing initial Prisma database connection...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('Initial database connection successful');
      }
    } catch (error) {
      console.error('Failed to connect to database:', error);
      if (!isProduction()) {
        process.exit(1); // Only exit in development environment
      }
    }
  })();
}

// Assign the PrismaClient instance to the global object in non-production environments
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
