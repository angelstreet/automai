import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
// Create a simple database interface that uses Supabase
const db = {
  // Generic query method
  async query(table: string, query: any = {}) {
    const cookieStore = await cookies();
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
      console.error(`Error querying ${table}:`, error);
      return [];
    }
    
    return data || [];
  },
  
  user: {
    async findUnique({ where }: { where: any }) {
      const cookieStore = await cookies();
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
      const cookieStore = await cookies();
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
      const cookieStore = await cookies();
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
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data, error } = await supabase
        .from('projects')
        .select()
        .match(where)
        .single();
      
      if (error) {
        console.error('Error finding project:', error);
        return null;
      }
      
      return data;
    },
    
    async create({ data }: { data: any }) {
      const cookieStore = await cookies();
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
      const cookieStore = await cookies();
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
      const cookieStore = await cookies();
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
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data, error } = await supabase
        .from('tenants')
        .select()
        .match(where)
        .single();
      
      if (error) {
        console.error('Error finding tenant:', error);
        return null;
      }
      
      return data;
    },
    
    async create({ data }: { data: any }) {
      const cookieStore = await cookies();
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
      const cookieStore = await cookies();
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
  
  // Add GitProvider model
  gitProvider: {
    async findMany(options: any = {}) {
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
      let builder = supabase.from('git_providers').select();
      
      // Apply filters if provided
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (key === 'OR' && Array.isArray(value)) {
            // Handle OR conditions
            // This is a simplified approach - for complex OR queries, you might need a different strategy
            console.warn('OR queries are not fully supported in this implementation');
          } else if (key === 'in' && typeof value === 'object' && value !== null) {
            // Handle 'in' query with null check
            const fieldNames = Object.keys(value);
            if (fieldNames.length > 0) {
              const fieldName = fieldNames[0];
              // Use type assertion to handle the indexing safely
              const fieldValue = value as Record<string, unknown>;
              const values = fieldValue[fieldName];
              if (Array.isArray(values)) {
                builder = builder.in(fieldName, values);
              }
            }
          } else {
            builder = builder.eq(key, value);
          }
        });
      }
      
      // Execute the query
      const { data, error } = await builder;
      
      if (error) {
        console.error('Error querying git providers:', error);
        return [];
      }
      
      return data || [];
    }
  },
  
  // Add Repository model
  repository: {
    async findMany(options: any = {}) {
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
      let selectQuery = '*';
      if (options.include?.provider) {
        selectQuery = '*, git_providers(*)';
      }
      
      let builder = supabase.from('repositories').select(selectQuery);
      
      // Apply filters if provided
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (key === 'provider_id' && typeof value === 'object' && value !== null && 'in' in value && Array.isArray((value as any).in)) {
            builder = builder.in('provider_id', (value as any).in);
          } else {
            builder = builder.eq(key, value);
          }
        });
      }
      
      // Apply pagination
      if (options.take) {
        builder = builder.limit(options.take);
      }
      
      if (options.skip) {
        builder = builder.range(options.skip, options.skip + (options.take || 10) - 1);
      }
      
      // Execute the query
      const { data, error } = await builder;
      
      if (error) {
        console.error('Error querying repositories:', error);
        return [];
      }
      
      return data || [];
    },
    
    async findUnique({ where }: { where: any }) {
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data, error } = await supabase
        .from('repositories')
        .select('*, git_providers(*)')
        .match(where)
        .single();
      
      if (error) {
        console.error('Error finding repository:', error);
        return null;
      }
      
      return data;
    },
    
    async create({ data }: { data: any }) {
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { data: result, error } = await supabase
        .from('repositories')
        .insert(data)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating repository:', error);
        throw error;
      }
      
      return result;
    },
    
    async update({ where, data }: { where: any; data: any }) {
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
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
      
      return result;
    },
    
    async delete({ where }: { where: any }) {
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
      const { error } = await supabase
        .from('repositories')
        .delete()
        .match(where);
      
      if (error) {
        console.error('Error deleting repository:', error);
        throw error;
      }
      
      return { success: true };
    }
  },
  
  // Add more tables as needed
};

export default db;