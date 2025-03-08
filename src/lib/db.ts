import { createClient } from '@/lib/supabase/server';


// Create a simple database interface that uses Supabase
const db = {
  // Generic query method
  async query(table: string, query: any = {}) {
    const cookieStore = cookies();
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const supabase = await createClient(cookieStore);
      
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
      const cookieStore = cookies();
      const supabase = await createClient(cookieStore);
      
      let builder = supabase.from('git_providers').select();
      
      // Apply filters if provided
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (key === 'userId') {
            builder = builder.eq('user_id', value);
          } else if (key === 'in' && typeof value === 'object') {
            // Handle 'in' query
            const fieldName = Object.keys(value)[0];
            const values = value[fieldName];
            builder = builder.in(fieldName, values);
          } else {
            builder = builder.eq(key, value);
          }
        });
      }
      
      // Handle select option
      if (options.select) {
        const selectFields = Object.keys(options.select).join(',');
        builder = supabase.from('git_providers').select(selectFields);
      }
      
      const { data, error } = await builder;
      
      if (error) {
        console.error('Error finding git providers:', error);
        throw error;
      }
      
      return data || [];
    }
  },
  
  // Add Repository model
  repository: {
    async findMany(options: any = {}) {
      const cookieStore = cookies();
      const supabase = await createClient(cookieStore);
      
      let selectQuery = '*';
      if (options.include?.provider) {
        selectQuery = '*, provider:git_providers(*)';
      }
      
      let builder = supabase.from('repositories').select(selectQuery);
      
      // Apply filters if provided
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (key === 'providerId') {
            if (typeof value === 'object' && value !== null && 'in' in value) {
              builder = builder.in('provider_id', value.in);
            } else {
              builder = builder.eq('provider_id', value);
            }
          } else {
            builder = builder.eq(key, value);
          }
        });
      }
      
      const { data, error } = await builder;
      
      if (error) {
        console.error('Error finding repositories:', error);
        throw error;
      }
      
      return data || [];
    }
  },
  
  // Add more tables as needed
};

export default db;