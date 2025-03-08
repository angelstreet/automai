import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Create a simple database interface that uses Supabase
const db = {
  // Generic query method
  async query(table: string, query: any = {}) {
    const cookieStore = cookies();
    const supabase = await createServerClient(cookieStore);
    
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
    
    // Apply ordering
    if (query.orderBy) {
      Object.entries(query.orderBy).forEach(([key, value]) => {
        builder = builder.order(key, { ascending: value === 'asc' });
      });
    }
    
    const { data, error } = await builder;
    
    if (error) {
      console.error('Database query error:', error);
      throw error;
    }
    
    return data;
  },
  
  user: {
    async findUnique({ where }: { where: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data, error } = await supabase
        .from('users')
        .select()
        .match(where)
        .single();
      
      if (error) {
        console.error('Error finding user:', error);
        return null;
      }
      
      return data;
    },
    
    async findMany(options: any = {}) {
      return db.query('users', options);
    },
    
    async create({ data }: { data: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
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
    
    async update({ where, data }: { where: any; data: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
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
    }
  },
  
  // Add other tables as needed following the same pattern
  project: {
    async findMany(options: any = {}) {
      return db.query('projects', options);
    },
    
    async findUnique({ where }: { where: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data, error } = await supabase
        .from('projects')
        .select()
        .match(where)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error finding project:', error);
        throw error;
      }
      
      return data || null;
    },
    
    async create({ data }: { data: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data: result, error } = await supabase
        .from('projects')
        .insert(data)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating project:', error);
        throw error;
      }
      
      return result;
    },
    
    async update({ where, data }: { where: any; data: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data: result, error } = await supabase
        .from('projects')
        .update(data)
        .match(where)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating project:', error);
        throw error;
      }
      
      return result;
    },
    
    async delete({ where }: { where: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .match(where);
      
      if (error) {
        console.error('Error deleting project:', error);
        throw error;
      }
      
      return { success: true };
    }
  },
  
  // Add tenant model
  tenant: {
    async findUnique({ where }: { where: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data, error } = await supabase
        .from('tenants')
        .select()
        .match(where)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error finding tenant:', error);
        throw error;
      }
      
      return data || null;
    },
    
    async create({ data }: { data: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
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
    
    async update({ where, data }: { where: any; data: any }) {
      const cookieStore = cookies();
      const supabase = await createServerClient(cookieStore);
      
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
    }
  },
  
  // Add more tables as needed
};

export default db;