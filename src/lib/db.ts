import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { GitProviderType } from '@/types/repositories';

// Create a supabase client
const supabase = createClient(cookies());

// Helper function to safely create Date objects
const safeDate = (value: unknown): Date => {
  if (!value) return safeDate(new Date());
  try {
    return new Date(value as string | number | Date);
  } catch (e) {
    console.error('Error creating date:', e);
    return safeDate(new Date());
  }
};

// Define database models here
export const db = {
  // User operations
  user: {
    findUnique: async ({ where }: { where: any }) => {
      const { data, error } = await supabase.from('users').select('*').match(where).single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding user:', error);
      }

      return data;
    },

    findMany: async (args: any = {}) => {
      let query = supabase.from('users').select('*');

      // Apply where conditions
      if (args.where) {
        Object.entries(args.where).forEach(([key, value]) => {
          // @ts-ignore
          query = query.eq(key, value);
        });
      }

      // Apply pagination
      if (args.take) {
        query = query.limit(args.take);
      }

      if (args.skip) {
        query = query.range(args.skip, args.skip + (args.take || 10) - 1);
      }

      // Apply ordering
      if (args.orderBy) {
        const [field, direction] = Object.entries(args.orderBy)[0];
        query = query.order(field as string, { ascending: direction === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error finding users:', error);
        return [];
      }

      return data || [];
    },

    create: async ({ data }: { data: any }) => {
      const { data: result, error } = await supabase.from('users').insert(data).select().single();

      if (error) {
        console.error('Error creating user:', error);
        throw error;
      }

      return result;
    },

    update: async ({ where, data }: { where: any; data: any }) => {
      const { data: result, error } = await supabase
        .from('users')
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      return result;
    },

    delete: async ({ where }: { where: any }) => {
      const { data: result, error } = await supabase
        .from('users')
        .delete()
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }

      return result;
    },
  },

  // Host operations
  host: {
    findUnique: async ({ where }: { where: any }) => {
      const { data, error } = await supabase.from('hosts').select('*').match(where).single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding host:', error);
      }

      return data;
    },

    findMany: async (args: any = {}) => {
      let query = supabase.from('hosts').select('*');

      // Apply where conditions
      if (args.where) {
        Object.entries(args.where).forEach(([key, value]) => {
          // @ts-ignore
          query = query.eq(key, value);
        });
      }

      // Apply pagination
      if (args.take) {
        query = query.limit(args.take);
      }

      if (args.skip) {
        query = query.range(args.skip, args.skip + (args.take || 10) - 1);
      }

      // Apply ordering
      if (args.orderBy) {
        const [field, direction] = Object.entries(args.orderBy)[0];
        query = query.order(field as string, { ascending: direction === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error finding hosts:', error);
        return [];
      }

      return data || [];
    },

    create: async ({ data }: { data: any }) => {
      const { data: result, error } = await supabase.from('hosts').insert(data).select().single();

      if (error) {
        console.error('Error creating host:', error);
        throw error;
      }

      return result;
    },

    update: async ({ where, data }: { where: any; data: any }) => {
      const { data: result, error } = await supabase
        .from('hosts')
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error updating host:', error);
        throw error;
      }

      return result;
    },

    delete: async ({ where }: { where: any }) => {
      const { data: result, error } = await supabase
        .from('hosts')
        .delete()
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error deleting host:', error);
        throw error;
      }

      return result;
    },
  },

  // Connection operations
  connection: {
    findUnique: async ({ where }: { where: any }) => {
      const { data, error } = await supabase.from('connections').select('*').match(where).single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding connection:', error);
      }

      return data;
    },

    findMany: async (args: any = {}) => {
      let query = supabase.from('connections').select('*');

      // Apply where conditions
      if (args.where) {
        Object.entries(args.where).forEach(([key, value]) => {
          // @ts-ignore
          query = query.eq(key, value);
        });
      }

      // Apply pagination
      if (args.take) {
        query = query.limit(args.take);
      }

      if (args.skip) {
        query = query.range(args.skip, args.skip + (args.take || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error finding connections:', error);
        return [];
      }

      return data || [];
    },

    create: async ({ data }: { data: any }) => {
      const { data: result, error } = await supabase
        .from('connections')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Error creating connection:', error);
        throw error;
      }

      return result;
    },

    update: async ({ where, data }: { where: any; data: any }) => {
      const { data: result, error } = await supabase
        .from('connections')
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error updating connection:', error);
        throw error;
      }

      return result;
    },

    delete: async ({ where }: { where: any }) => {
      const { data: result, error } = await supabase
        .from('connections')
        .delete()
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error deleting connection:', error);
        throw error;
      }

      return result;
    },
  },

  // Tenant operations
  tenant: {
    findUnique: async ({ where }: { where: any }) => {
      const { data, error } = await supabase.from('tenants').select('*').match(where).single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding tenant:', error);
      }

      return data;
    },

    findMany: async (args: any = {}) => {
      let query = supabase.from('tenants').select('*');

      // Apply where conditions
      if (args.where) {
        Object.entries(args.where).forEach(([key, value]) => {
          // @ts-ignore
          query = query.eq(key, value);
        });
      }

      // Apply pagination
      if (args.take) {
        query = query.limit(args.take);
      }

      if (args.skip) {
        query = query.range(args.skip, args.skip + (args.take || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error finding tenants:', error);
        return [];
      }

      return data || [];
    },

    create: async ({ data }: { data: any }) => {
      const { data: result, error } = await supabase.from('tenants').insert(data).select().single();

      if (error) {
        console.error('Error creating tenant:', error);
        throw error;
      }

      return result;
    },

    update: async ({ where, data }: { where: any; data: any }) => {
      const { data: result, error } = await supabase
        .from('tenants')
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error updating tenant:', error);
        throw error;
      }

      return result;
    },

    delete: async ({ where }: { where: any }) => {
      const { data: result, error } = await supabase
        .from('tenants')
        .delete()
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error deleting tenant:', error);
        throw error;
      }

      return result;
    },
  },

  // Repository operations
  repository: {
    findUnique: async ({ where, include }: { where: any; include?: any }) => {
      let query = supabase.from('repositories').select('*').match(where).single();

      const { data, error } = await query;

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding repository:', error);
      }

      // Transform the data to match the Repository type
      if (data) {
        return {
          id: data.id as string,
          providerId: data.providerId as string,
          name: data.name as string,
          owner: data.owner as string,
          url: data.url as string | undefined,
          branch: data.branch as string | undefined,
          defaultBranch: data.defaultBranch as string | undefined,
          isPrivate: Boolean(data.isPrivate),
          description: data.description as string | undefined,
          syncStatus: data.syncStatus as 'SYNCED' | 'PENDING' | 'ERROR',
          createdAt: safeDate(data.createdAt),
          updatedAt: safeDate(data.updatedAt),
          lastSyncedAt: data.lastSyncedAt ? safeDate(data.lastSyncedAt) : undefined,
          error: data.error as string | undefined,
          provider: include?.provider
            ? {
                id: '',
                userId: '',
                tenantId: '',
                type: 'github' as GitProviderType,
                displayName: '',
                status: 'connected' as 'connected' | 'disconnected',
                createdAt: safeDate(safeDate(new Date())),
                updatedAt: safeDate(safeDate(new Date())),
                name: 'github' as GitProviderType,
              }
            : undefined,
          project: include?.project ? { id: '', name: '' } : undefined,
        };
      }

      return data;
    },

    findMany: async ({
      where,
      include,
      take,
      skip,
      orderBy,
    }: {
      where?: any;
      include?: any;
      take?: number;
      skip?: number;
      orderBy?: any;
    }) => {
      let query = supabase.from('repositories').select('*');

      // Apply where conditions
      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          // @ts-ignore
          query = query.eq(key, value);
        });
      }

      // Apply pagination
      if (take) {
        query = query.limit(take);
      }

      if (skip) {
        query = query.range(skip, skip + (take || 10) - 1);
      }

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        query = query.order(field as string, { ascending: direction === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error finding repositories:', error);
        return [];
      }

      // Transform the data to match the Repository type
      return (data || []).map((repo) => ({
        id: repo.id as string,
        providerId: repo.providerId as string,
        name: repo.name as string,
        owner: repo.owner as string,
        url: repo.url as string | undefined,
        branch: repo.branch as string | undefined,
        defaultBranch: repo.defaultBranch as string | undefined,
        isPrivate: Boolean(repo.isPrivate),
        description: repo.description as string | undefined,
        syncStatus: repo.syncStatus as 'SYNCED' | 'PENDING' | 'ERROR',
        createdAt: safeDate(repo.createdAt),
        updatedAt: safeDate(repo.updatedAt),
        lastSyncedAt: repo.lastSyncedAt ? safeDate(repo.lastSyncedAt) : undefined,
        error: repo.error as string | undefined,
        provider: include?.provider
          ? {
              id: '',
              userId: '',
              tenantId: '',
              type: 'github' as GitProviderType,
              displayName: '',
              status: 'connected' as 'connected' | 'disconnected',
              createdAt: safeDate(new Date()),
              updatedAt: safeDate(new Date()),
              name: 'github' as GitProviderType,
            }
          : undefined,
        project: include?.project ? { id: '', name: '' } : undefined,
      }));
    },

    create: async ({ data, include }: { data: any; include?: any }) => {
      const { data: result, error } = await supabase
        .from('repositories')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Error creating repository:', error);
        throw error;
      }

      // Transform the data to match the Repository type
      return {
        id: result.id as string,
        providerId: result.providerId as string,
        name: result.name as string,
        owner: result.owner as string,
        url: result.url as string | undefined,
        branch: result.branch as string | undefined,
        defaultBranch: result.defaultBranch as string | undefined,
        isPrivate: Boolean(result.isPrivate),
        description: result.description as string | undefined,
        syncStatus: result.syncStatus as 'SYNCED' | 'PENDING' | 'ERROR',
        createdAt: safeDate(result.createdAt),
        updatedAt: safeDate(result.updatedAt),
        lastSyncedAt: result.lastSyncedAt ? safeDate(result.lastSyncedAt) : undefined,
        error: result.error as string | undefined,
        provider: include?.provider
          ? {
              id: '',
              userId: '',
              tenantId: '',
              type: 'github' as GitProviderType,
              displayName: '',
              status: 'connected' as 'connected' | 'disconnected',
              createdAt: safeDate(new Date()),
              updatedAt: safeDate(new Date()),
              name: 'github' as GitProviderType,
            }
          : undefined,
        project: include?.project ? { id: '', name: '' } : undefined,
      };
    },

    update: async ({ where, data, include }: { where: any; data: any; include?: any }) => {
      const { data: result, error } = await supabase
        .from('repositories')
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error updating repository:', error);
        throw error;
      }

      // Transform the data to match the Repository type
      return {
        id: result.id as string,
        providerId: result.providerId as string,
        name: result.name as string,
        owner: result.owner as string,
        url: result.url as string | undefined,
        branch: result.branch as string | undefined,
        defaultBranch: result.defaultBranch as string | undefined,
        isPrivate: Boolean(result.isPrivate),
        description: result.description as string | undefined,
        syncStatus: result.syncStatus as 'SYNCED' | 'PENDING' | 'ERROR',
        createdAt: safeDate(result.createdAt),
        updatedAt: safeDate(result.updatedAt),
        lastSyncedAt: result.lastSyncedAt ? safeDate(result.lastSyncedAt) : undefined,
        error: result.error as string | undefined,
        provider: include?.provider
          ? {
              id: '',
              userId: '',
              tenantId: '',
              type: 'github' as GitProviderType,
              displayName: '',
              status: 'connected' as 'connected' | 'disconnected',
              createdAt: safeDate(new Date()),
              updatedAt: safeDate(new Date()),
              name: 'github' as GitProviderType,
            }
          : undefined,
        project: include?.project ? { id: '', name: '' } : undefined,
      };
    },

    delete: async ({ where }: { where: any }) => {
      const { data: result, error } = await supabase
        .from('repositories')
        .delete()
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error deleting repository:', error);
        throw error;
      }

      return result;
    },
  },

  // Git Provider operations
  gitProvider: {
    findUnique: async ({ where }: { where: any }) => {
      const { data, error } = await supabase
        .from('git_providers')
        .select('*')
        .match(where)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding git provider:', error);
      }

      // Transform the data to match the GitProvider type
      if (data) {
        return {
          id: data.id as string,
          userId: data.userId as string,
          tenantId: data.tenantId as string,
          type: data.type as GitProviderType,
          displayName: data.displayName as string,
          status: data.status as 'connected' | 'disconnected',
          serverUrl: data.serverUrl as string | undefined,
          accessToken: data.accessToken as string | undefined,
          refreshToken: data.refreshToken as string | undefined,
          createdAt: safeDate(data.createdAt),
          updatedAt: safeDate(data.updatedAt),
          lastSyncedAt: data.lastSyncedAt ? safeDate(data.lastSyncedAt) : undefined,
          expiresAt: data.expiresAt ? safeDate(data.expiresAt) : undefined,
          name: data.type as GitProviderType,
        };
      }

      return data;
    },

    findMany: async ({
      where,
      take,
      skip,
      orderBy,
    }: {
      where?: any;
      take?: number;
      skip?: number;
      orderBy?: any;
    }) => {
      let query = supabase.from('git_providers').select('*');

      // Apply where conditions
      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          // @ts-ignore
          query = query.eq(key, value);
        });
      }

      // Apply pagination
      if (take) {
        query = query.limit(take);
      }

      if (skip) {
        query = query.range(skip, skip + (take || 10) - 1);
      }

      // Apply ordering
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0];
        query = query.order(field as string, { ascending: direction === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error finding git providers:', error);
        return [];
      }

      // Transform the data to match the GitProvider type
      return (data || []).map((provider) => ({
        id: provider.id as string,
        userId: provider.userId as string,
        tenantId: provider.tenantId as string,
        type: provider.type as GitProviderType,
        displayName: provider.displayName as string,
        status: provider.status as 'connected' | 'disconnected',
        serverUrl: provider.serverUrl as string | undefined,
        accessToken: provider.accessToken as string | undefined,
        refreshToken: provider.refreshToken as string | undefined,
        createdAt: safeDate(provider.createdAt),
        updatedAt: safeDate(provider.updatedAt),
        lastSyncedAt: provider.lastSyncedAt ? safeDate(provider.lastSyncedAt) : undefined,
        expiresAt: provider.expiresAt ? safeDate(provider.expiresAt) : undefined,
        name: provider.type as GitProviderType,
      }));
    },

    create: async ({ data }: { data: any }) => {
      const { data: result, error } = await supabase
        .from('git_providers')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Error creating git provider:', error);
        throw error;
      }

      // Transform the data to match the GitProvider type
      return {
        id: result.id as string,
        userId: result.userId as string,
        tenantId: result.tenantId as string,
        type: result.type as GitProviderType,
        displayName: result.displayName as string,
        status: result.status as 'connected' | 'disconnected',
        serverUrl: result.serverUrl as string | undefined,
        accessToken: result.accessToken as string | undefined,
        refreshToken: result.refreshToken as string | undefined,
        createdAt: safeDate(result.createdAt),
        updatedAt: safeDate(result.updatedAt),
        lastSyncedAt: result.lastSyncedAt ? safeDate(result.lastSyncedAt) : undefined,
        expiresAt: result.expiresAt ? safeDate(result.expiresAt) : undefined,
        name: result.type as GitProviderType,
      };
    },

    update: async ({ where, data }: { where: any; data: any }) => {
      const { data: result, error } = await supabase
        .from('git_providers')
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error updating git provider:', error);
        throw error;
      }

      // Transform the data to match the GitProvider type
      return {
        id: result.id as string,
        userId: result.userId as string,
        tenantId: result.tenantId as string,
        type: result.type as GitProviderType,
        displayName: result.displayName as string,
        status: result.status as 'connected' | 'disconnected',
        serverUrl: result.serverUrl as string | undefined,
        accessToken: result.accessToken as string | undefined,
        refreshToken: result.refreshToken as string | undefined,
        createdAt: safeDate(result.createdAt),
        updatedAt: safeDate(result.updatedAt),
        lastSyncedAt: result.lastSyncedAt ? safeDate(result.lastSyncedAt) : undefined,
        expiresAt: result.expiresAt ? safeDate(result.expiresAt) : undefined,
        name: result.type as GitProviderType,
      };
    },

    delete: async ({ where }: { where: any }) => {
      const { data: result, error } = await supabase
        .from('git_providers')
        .delete()
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('Error deleting git provider:', error);
        throw error;
      }

      // Transform the data to match the GitProvider type
      return {
        id: result.id as string,
        userId: result.userId as string,
        tenantId: result.tenantId as string,
        type: result.type as GitProviderType,
        displayName: result.displayName as string,
        status: result.status as 'connected' | 'disconnected',
        serverUrl: result.serverUrl as string | undefined,
        accessToken: result.accessToken as string | undefined,
        refreshToken: result.refreshToken as string | undefined,
        createdAt: safeDate(result.createdAt),
        updatedAt: safeDate(result.updatedAt),
        lastSyncedAt: result.lastSyncedAt ? safeDate(result.lastSyncedAt) : undefined,
        expiresAt: result.expiresAt ? safeDate(result.expiresAt) : undefined,
        name: result.type as GitProviderType,
      };
    },
  },

  // Add other models as needed
  // Each model follows the same pattern
};

export default db;
