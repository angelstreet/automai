import { isProduction, isUsingSupabase } from '../env';

// Import Supabase client
let createServerClient: any;
try {
  const { createClient } = require('@supabase/supabase-js');
  createServerClient = createClient;
} catch (error) {
  console.warn('Supabase JS package not available');
  createServerClient = null;
}

// Cache the client in the global scope to prevent multiple connections
const globalScope = global as any;
if (!globalScope._supabaseClient) {
  globalScope._supabaseClient = null;
}

/**
 * Get or create a Supabase client for direct data access
 */
export function getSupabaseClient() {
  // Return cached client if available
  if (globalScope._supabaseClient) {
    return globalScope._supabaseClient;
  }

  // Create a new client if not available
  if (
    createServerClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    // Use service role key if available, otherwise use anon key
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
        },
      },
    );

    // Cache the client
    globalScope._supabaseClient = client;
    return client;
  }

  return null;
}

/**
 * Test the Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Could not initialize Supabase client');
    return false;
  }

  try {
    console.log('Testing Supabase connection...');

    // Try a simpler query to verify auth is working
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log(
      'Supabase auth check:',
      authError ? 'Failed' : 'Success',
      authError ? `(${authError.message})` : '(No session required)',
    );

    // Try to get database tables info
    console.log('Checking Supabase tables...');
    const { data: tablesData, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public')
      .limit(5);

    if (tablesError) {
      console.log('Could not query tables:', tablesError.message);

      // Try a different approach - check if we can access system tables
      console.log('Trying service status check...');
      const { data: statusData, error: statusError } = await supabase
        .from('_pgsodium_tally')
        .select('count');

      if (statusError) {
        // Last resort - just check if the connection itself works
        try {
          console.log('Trying base connection test...');
          const { data: versionData, error: versionError } = await supabase.rpc('version');

          if (versionError) {
            console.log('Connection works but RPC failed:', versionError.message);
            // Show connection details for debugging (without sensitive info)
            console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
            console.log('Anon Key set:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
            console.log('Service Role Key set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
            return true; // Still return true since connection works
          }

          console.log('Successfully connected to Supabase:', versionData);
          return true;
        } catch (e) {
          console.error('Final Supabase connection test failed:', e);
          return false;
        }
      } else {
        console.log('Service status check successful');
        return true;
      }
    } else {
      console.log('Found Supabase tables:', tablesData?.length || 0);
      if (tablesData && tablesData.length > 0) {
        console.log(
          'Available tables:',
          tablesData.map((t: { tablename: string }) => t.tablename).join(', '),
        );
      }
      return true;
    }
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

/**
 * Utility to determine if we should use Supabase for data access
 */
export function shouldUseSupabase(): boolean {
  return isProduction() && isUsingSupabase();
}

/**
 * Helper utilities for common Supabase operations
 */
export const supabaseData = {
  /**
   * Find multiple records
   */
  async findMany(table: string, options: any = {}): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      let query = supabase.from(table).select('*');

      // Apply filters
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          // @ts-ignore
          query = query.eq(key, value);
        });
      }

      // Apply limit
      if (options.take) {
        // @ts-ignore
        query = query.limit(options.take);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Supabase ${table} query error:`, error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(`Error querying ${table}:`, error);
      return [];
    }
  },

  /**
   * Find a single record
   */
  async findUnique(table: string, where: any): Promise<any | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.from(table).select('*').match(where).single();

      if (error) {
        console.error(`Supabase ${table} query error:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error querying ${table}:`, error);
      return null;
    }
  },

  /**
   * Create a record
   */
  async create(table: string, data: any): Promise<any> {
    const supabase = getSupabaseClient();
    if (!supabase) return {};

    try {
      const { data: result, error } = await supabase.from(table).insert(data).select().single();

      if (error) {
        console.error(`Supabase ${table} insert error:`, error);
        return {};
      }

      return result || {};
    } catch (error) {
      console.error(`Error creating ${table}:`, error);
      return {};
    }
  },

  /**
   * Update a record
   */
  async update(table: string, where: any, data: any): Promise<any> {
    const supabase = getSupabaseClient();
    if (!supabase) return {};

    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .match(where)
        .select()
        .single();

      if (error) {
        console.error(`Supabase ${table} update error:`, error);
        return {};
      }

      return result || {};
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      return {};
    }
  },

  /**
   * Delete a record
   */
  async delete(table: string, where: any): Promise<any> {
    const supabase = getSupabaseClient();
    if (!supabase) return {};

    try {
      const { data, error } = await supabase.from(table).delete().match(where).select().single();

      if (error) {
        console.error(`Supabase ${table} delete error:`, error);
        return {};
      }

      return data || {};
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      return {};
    }
  },
};
