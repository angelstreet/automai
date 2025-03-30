import { cookies } from 'next/headers';

import { createClient } from './server';

// Create a simple database interface that uses Supabase
const db = {
  // Generic query method
  async query(table: string, query: any = {}) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    let builder = supabase.from(table).select();

    // Apply filters if provided
    if (query.where) {
      Object.entries(query.where).forEach(([key, value]) => {
        builder = builder.eq(key, value);
      });
    }

    // Apply pagination
    if (query.take) {
      builder = builder.limit(query.take);
    }

    if (query.skip) {
      builder = builder.range(query.skip, query.skip + (query.take || 10) - 1);
    }

    // Execute the query
    const { data, error } = await builder;

    if (error) {
      console.error(`Error querying ${table}:`, error);
      return [];
    }

    return data || [];
  },

  user: {
    findUnique: async function (where: any = {}) {
      const supabase = await createClient();
      const { data, error } = await supabase.from('profiles').select().match(where).single();

      if (error) {
        console.error('[@db:user:findUnique] Error finding user:', error);
        return null;
      }

      return data;
    },

    findMany: async function (options: any = {}) {
      return db.query('users', options);
    },

    create: async function (data: any = {}) {
      const supabase = await createClient();
      const { data: result, error } = await supabase
        .from('profiles')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('[@db:user:create] Error creating user:', error);
        throw error;
      }

      return result;
    },

    update: async function (where: any = {}, data: any = {}) {
      const supabase = await createClient();
      const { data: result, error } = await supabase
        .from('profiles')
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('[@db:user:update] Error updating user:', error);
        throw error;
      }

      return result;
    },
  },

  project: {
    findUnique: async function (where: any = {}) {
      const supabase = await createClient();
      const { data, error } = await supabase.from('projects').select().match(where).single();

      if (error) {
        console.error('[@db:project:findUnique] Error finding project:', error);
        return null;
      }

      return data;
    },

    findMany: async function (options: any = {}) {
      return db.query('projects', options);
    },

    create: async function (data: any = {}) {
      const supabase = await createClient();
      const { data: result, error } = await supabase
        .from('projects')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[@db:project:create] Error creating project:', error);
        throw error;
      }

      return result;
    },

    update: async function (where: any = {}, data: any = {}) {
      const supabase = await createClient();
      const { data: result, error } = await supabase
        .from('projects')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('[@db:project:update] Error updating project:', error);
        throw error;
      }

      return result;
    },

    delete: async function (where: any = {}) {
      const supabase = await createClient();
      const { error } = await supabase.from('projects').delete().match(where);

      if (error) {
        console.error('[@db:project:delete] Error deleting project:', error);
        throw error;
      }

      return { success: true };
    },
  },

  tenant: {
    findUnique: async function (where: any = {}) {
      const supabase = await createClient();
      const { data, error } = await supabase.from('tenants').select().match(where).single();

      if (error) {
        console.error('[@db:tenant:findUnique] Error finding tenant:', error);
        return null;
      }

      return data;
    },

    findMany: async function (where: any = {}) {
      const supabase = await createClient();

      // Build the query with any provided filters
      let query = supabase.from('tenants').select();

      // Apply filters dynamically
      if (Object.keys(where).length > 0) {
        query = query.match(where);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[@db:tenant:findMany] Error finding tenants:', error);
        return [];
      }

      return data || [];
    },

    create: async function (data: any = {}) {
      const supabase = await createClient();
      const { data: result, error } = await supabase.from('tenants').insert(data).select().single();

      if (error) {
        console.error('[@db:tenant:create] Error creating tenant:', error);
        throw error;
      }

      return result;
    },

    update: async function (where: any = {}, data: any = {}) {
      const supabase = await createClient();
      const { data: result, error } = await supabase
        .from('tenants')
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error('[@db:tenant:update] Error updating tenant:', error);
        throw error;
      }

      return result;
    },
  },
};

export default db;
