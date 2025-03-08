import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Create a simple database interface that uses Supabase
const db = {
  // Generic query method
  async query(table: string, query: any = {}) {
    const supabase = await createServerClient();
    
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
  
  // Table-specific methods to mimic Prisma's API
  user: {
    async findUnique({ where }: { where: any }) {
      const supabase = await createServerClient();
      
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
      const supabase = await createServerClient();
      
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
      const supabase = await createServerClient();
      
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
      const supabase = await createServerClient();
      
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
      const supabase = await createServerClient();
      
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
      const supabase = await createServerClient();
      
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
      const supabase = await createServerClient();
      
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
  
  // Add more tables as needed
};

export default db;