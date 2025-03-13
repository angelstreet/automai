import { createClient } from '../server';
import { cookies } from 'next/headers';

// Host DB operations
const host = {
  async findMany(options: any = {}) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    let builder = supabase.from('hosts').select('*');

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

    const { data, error } = await supabase.from('hosts').select().match(where).single();

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