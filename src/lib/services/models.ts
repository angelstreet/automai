import supabase from '../supabase';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// Helper to apply common filters
function applyFilters<T>(
  query: PostgrestFilterBuilder<any, any, T[], unknown>,
  where: Record<string, any> = {},
) {
  let filteredQuery = query;

  Object.entries(where).forEach(([key, value]) => {
    if (value === null) {
      filteredQuery = filteredQuery.is(key, null) as any;
    } else if (typeof value === 'object' && value !== null) {
      // Handle Prisma-like operators
      Object.entries(value).forEach(([op, opValue]) => {
        switch (op) {
          case 'equals':
            filteredQuery = filteredQuery.eq(key, opValue) as any;
            break;
          case 'not':
            filteredQuery = filteredQuery.neq(key, opValue) as any;
            break;
          case 'gt':
            filteredQuery = filteredQuery.gt(key, opValue) as any;
            break;
          case 'gte':
            filteredQuery = filteredQuery.gte(key, opValue) as any;
            break;
          case 'lt':
            filteredQuery = filteredQuery.lt(key, opValue) as any;
            break;
          case 'lte':
            filteredQuery = filteredQuery.lte(key, opValue) as any;
            break;
          case 'in':
            filteredQuery = filteredQuery.in(
              key,
              Array.isArray(opValue) ? opValue : [opValue],
            ) as any;
            break;
          case 'contains':
            filteredQuery = filteredQuery.ilike(key, `%${opValue}%`) as any;
            break;
          // Add other operators as needed
        }
      });
    } else {
      // Simple equality
      filteredQuery = filteredQuery.eq(key, value) as any;
    }
  });

  return filteredQuery;
}

// User model operations
export const userService = {
  findMany: async (args: any = {}) => {
    try {
      let query = supabase.from('users').select('*');

      // Apply filter conditions if provided
      if (args.where) {
        query = applyFilters(query, args.where);
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
        console.error('Error fetching users:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Error in userService.findMany:', err);
      return [];
    }
  },

  findUnique: async (args: any) => {
    if (!args?.where) return null;

    try {
      const { data, error } = await supabase.from('users').select('*').match(args.where).single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error fetching user:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in userService.findUnique:', err);
      return null;
    }
  },

  create: async (args: any) => {
    if (!args?.data) throw new Error('Data is required');

    try {
      const { data, error } = await supabase.from('users').insert(args.data).select().single();

      if (error) {
        console.error('Error creating user:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in userService.create:', err);
      throw err;
    }
  },

  update: async (args: any) => {
    if (!args?.where || !args?.data) throw new Error('Where and data are required');

    try {
      const { data, error } = await supabase
        .from('users')
        .update(args.data)
        .match(args.where)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in userService.update:', err);
      throw err;
    }
  },

  delete: async (args: any) => {
    if (!args?.where) throw new Error('Where is required');

    try {
      const { data, error } = await supabase
        .from('users')
        .delete()
        .match(args.where)
        .select()
        .single();

      if (error) {
        console.error('Error deleting user:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in userService.delete:', err);
      throw err;
    }
  },
};

// Host model operations
export const hostService = {
  findMany: async (args: any = {}) => {
    try {
      let query = supabase.from('hosts').select('*');

      if (args.where) {
        query = applyFilters(query, args.where);
      }

      if (args.take) {
        query = query.limit(args.take);
      }

      if (args.skip) {
        query = query.range(args.skip, args.skip + (args.take || 10) - 1);
      }

      if (args.orderBy) {
        const [field, direction] = Object.entries(args.orderBy)[0];
        query = query.order(field as string, { ascending: direction === 'asc' });
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching hosts:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Error in hostService.findMany:', err);
      return [];
    }
  },

  findUnique: async (args: any) => {
    if (!args?.where) return null;

    try {
      const { data, error } = await supabase.from('hosts').select('*').match(args.where).single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error fetching host:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in hostService.findUnique:', err);
      return null;
    }
  },

  create: async (args: any) => {
    if (!args?.data) throw new Error('Data is required');

    try {
      const { data, error } = await supabase.from('hosts').insert(args.data).select().single();

      if (error) {
        console.error('Error creating host:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in hostService.create:', err);
      throw err;
    }
  },

  update: async (args: any) => {
    if (!args?.where || !args?.data) throw new Error('Where and data are required');

    try {
      const { data, error } = await supabase
        .from('hosts')
        .update(args.data)
        .match(args.where)
        .select()
        .single();

      if (error) {
        console.error('Error updating host:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in hostService.update:', err);
      throw err;
    }
  },

  delete: async (args: any) => {
    if (!args?.where) throw new Error('Where is required');

    try {
      const { data, error } = await supabase
        .from('hosts')
        .delete()
        .match(args.where)
        .select()
        .single();

      if (error) {
        console.error('Error deleting host:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in hostService.delete:', err);
      throw err;
    }
  },
};

// Add other model services as needed following the same pattern
// export const connectionService = {...}
// export const repositoryService = {...}
// etc.
