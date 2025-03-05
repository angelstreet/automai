import { createServerSupabase } from './supabase';

// Create a supabase client
const supabase = createServerSupabase();

// Define database models here
export const db = {
  // User operations
  user: {
    findUnique: async ({ where }: { where: any }) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .match(where)
        .single();
        
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
      const { data: result, error } = await supabase
        .from('users')
        .insert(data)
        .select()
        .single();
        
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
      const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .match(where)
        .single();
        
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
      const { data: result, error } = await supabase
        .from('hosts')
        .insert(data)
        .select()
        .single();
        
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
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .match(where)
        .single();
        
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
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .match(where)
        .single();
        
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
      const { data: result, error } = await supabase
        .from('tenants')
        .insert(data)
        .select()
        .single();
        
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

  // Add other models as needed
  // Each model follows the same pattern
};

export default db;