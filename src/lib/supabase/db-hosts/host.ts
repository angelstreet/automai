import { createClient } from '../server';
import { cookies } from 'next/headers';

// Host DB operations
const host = {
  async findMany(options: any = {}) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // First fetch the current user's role and tenant to make policy decisions client-side
    // This avoids the infinite recursion in the database policies
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user for hosts query:', userError);
      return [];
    }
    
    // Extract tenant_id for the query
    const tenant_id = userData.user?.user_metadata?.tenant_id || (userData.user as any)?.tenant_id;
    
    // Start building the query
    let builder = supabase.from('hosts').select('*');
    
    // Add tenant_id filter to avoid policy recursion
    if (tenant_id) {
      builder = builder.eq('tenant_id', tenant_id);
    }

    // Apply filters if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        builder = builder.eq(key, value);
      });
    }

    // Apply ordering
    if (options.orderBy) {
      const [field, direction] = Object.entries(options.orderBy)[0];
      builder = builder.order(field as string, { ascending: direction === 'asc' });
    } else {
      builder = builder.order('created_at', { ascending: false });
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
      console.error('Error querying hosts:', error);
      return [];
    }

    return data || [];
  },

  async findUnique({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // First fetch the current user's role and tenant to make policy decisions client-side
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user for host query:', userError);
      return null;
    }
    
    // Extract tenant_id for the query
    const tenant_id = userData.user?.user_metadata?.tenant_id || (userData.user as any)?.tenant_id;
    
    let query = supabase.from('hosts').select();
    
    // Add tenant_id filter to avoid policy recursion
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }
    
    // Apply the 'where' conditions
    const { data, error } = await query.match(where).single();

    if (error) {
      console.error('Error finding host:', error);
      return null;
    }

    return data;
  },

  async create({ data }: { data: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: result, error } = await supabase.from('hosts').insert(data).select().single();

    if (error) {
      console.error('Error creating host:', error);
      throw error;
    }

    return result;
  },

  async update({ where, data }: { where: any; data: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

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

  async delete({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { error } = await supabase.from('hosts').delete().eq('id', where.id);

    if (error) {
      console.error('Error deleting host:', error);
      throw error;
    }

    return { success: true };
  },
};

export default host;
