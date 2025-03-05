// This is a compatibility layer that lets us switch from Prisma to Supabase
// without changing the rest of the codebase

import { isProduction, isDevelopment, isUsingSupabase } from './env';
import { userService, hostService } from './services/models';

// This file provides a drop-in replacement for Prisma client imports
// that routes calls to Supabase instead

class PrismaAdapter {
  // Add models that mirror Prisma's interface
  readonly user = {
    findMany: async (args: any = {}) => {
      if (isUsingSupabase()) {
        return userService.findMany(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return [];
      }
    },
    findUnique: async (args: any) => {
      if (isUsingSupabase()) {
        return userService.findUnique(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return null;
      }
    },
    create: async (args: any) => {
      if (isUsingSupabase()) {
        return userService.create(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return {};
      }
    },
    update: async (args: any) => {
      if (isUsingSupabase()) {
        return userService.update(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return {};
      }
    },
    delete: async (args: any) => {
      if (isUsingSupabase()) {
        return userService.delete(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return {};
      }
    },
    // Add other methods as needed
  };

  readonly host = {
    findMany: async (args: any = {}) => {
      if (isUsingSupabase()) {
        return hostService.findMany(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return [];
      }
    },
    findUnique: async (args: any) => {
      if (isUsingSupabase()) {
        return hostService.findUnique(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return null;
      }
    },
    create: async (args: any) => {
      if (isUsingSupabase()) {
        return hostService.create(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return {};
      }
    },
    update: async (args: any) => {
      if (isUsingSupabase()) {
        return hostService.update(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return {};
      }
    },
    delete: async (args: any) => {
      if (isUsingSupabase()) {
        return hostService.delete(args);
      } else {
        console.warn('Prisma adapter used but Supabase is not enabled');
        return {};
      }
    },
    // Add other methods as needed
  };

  // Add other models following the same pattern

  // Add utility methods that Prisma provides
  async $queryRaw(query: any, ...args: any[]) {
    console.warn('$queryRaw is not supported with Supabase adapter');
    return [];
  }

  async $connect() {
    // No-op
    return;
  }

  async $disconnect() {
    // No-op
    return;
  }
}

// Create a singleton instance
const prismaAdapter = new PrismaAdapter();

export default prismaAdapter;