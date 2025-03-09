'use server';

import db from '@/lib/supabase/db';
import { supabaseAuth } from '@/lib/supabase/auth';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

interface Tenant {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export async function getTenants(userId: string): Promise<{ success: boolean; error?: string; data?: Tenant[] }> {
  try {
    // First, get the user to check which tenant they belong to
    const user = await supabaseAuth.getUser();
    
    if (!user.success || !user.data) {
      return { success: false, error: 'User not found' };
    }
    
    // Get the tenant_id from user metadata
    const tenantId = user.data.tenant_id;
    console.log('getTenants: User tenant_id from metadata:', tenantId);
    
    // Import the admin client for elevated permissions
    const { createClient: createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();
    
    if (!tenantId) {
      console.log('getTenants: No tenant_id in metadata, getting all tenants with admin client');
      // If no tenant_id in metadata, get all tenants (or default) using admin client
      const { data, error } = await adminClient
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('getTenants: Error fetching all tenants with admin client:', error);
        return { success: false, error: error.message };
      }
      
      if (!data || data.length === 0) {
        // No tenants found, create a default one using admin client
        console.log('getTenants: No tenants found, creating default tenant with admin client');
        try {
          const { data: defaultTenant, error: createError } = await adminClient
            .from('tenants')
            .insert({
              id: 'default',
              name: 'Default',
              plan: 'free',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            console.error('getTenants: Error creating default tenant with admin client:', createError);
            return { success: false, error: 'Failed to create default tenant: ' + createError.message };
          }
          
          return { success: true, data: [defaultTenant] };
        } catch (createError: any) {
          console.error('getTenants: Exception creating default tenant:', createError);
          return { success: false, error: 'Failed to create default tenant: ' + createError.message };
        }
      }
      
      return { success: true, data };
    }
    
    // Get the specific tenant using admin client
    console.log('getTenants: Getting specific tenant by ID using admin client:', tenantId);
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    if (tenantError && tenantError.code !== 'PGRST116') {
      console.error('getTenants: Error fetching tenant with admin client:', tenantError);
      
      // If there's a real error (not just "no rows returned"), try to fetch all tenants
      const { data: allTenants, error: allError } = await adminClient
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (allError) {
        console.error('getTenants: Error fetching all tenants after tenant error:', allError);
        return { success: false, error: 'Failed to fetch tenants: ' + allError.message };
      }
      
      return { success: true, data: allTenants || [] };
    }
    
    if (!tenant) {
      console.log('getTenants: Tenant not found, creating it using ID with admin client');
      // Tenant not found, create it using the ID with admin client
      try {
        const { data: newTenant, error: createError } = await adminClient
          .from('tenants')
          .insert({
            id: tenantId,
            name: tenantId.toLowerCase(),
            plan: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error('getTenants: Failed to create missing tenant with admin client:', createError);
          
          // If tenant creation fails, fall back to getting all tenants
          console.log('getTenants: Falling back to getting all tenants with admin client');
          const { data: allTenants, error: allError } = await adminClient
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (allError) {
            console.error('getTenants: Error fetching all tenants after create failure:', allError);
            return { success: false, error: 'Failed to create tenant and fetch alternatives: ' + allError.message };
          }
          
          return { success: true, data: allTenants || [] };
        }
        
        console.log('getTenants: Successfully created missing tenant with admin client:', newTenant);
        return { success: true, data: [newTenant] };
      } catch (createError: any) {
        console.error('getTenants: Exception creating missing tenant:', createError);
        
        // If tenant creation fails with exception, fall back to getting all tenants
        console.log('getTenants: Falling back to getting all tenants after exception');
        const { data: allTenants, error: allError } = await adminClient
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (allError) {
          console.error('getTenants: Error fetching all tenants after exception:', allError);
          return { success: false, error: 'Failed to create tenant and fetch alternatives: ' + createError.message };
        }
        
        return { success: true, data: allTenants || [] };
      }
    }
    
    console.log('getTenants: Found tenant with admin client:', tenant);
    // Return the tenant as an array
    return { success: true, data: [tenant] };
  } catch (error: any) {
    console.error('Error in getTenants:', error);
    return { success: false, error: error.message || 'Failed to fetch tenants' };
  }
}

export async function switchTenant(tenantName: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('switchTenant: Switching to tenant:', tenantName);
    
    // Update the user profile with tenant_name only
    const result = await supabaseAuth.updateProfile({ 
      tenant_name: tenantName
    });
    
    return { 
      success: result.success, 
      error: result.error || undefined 
    };
  } catch (error: any) {
    console.error('Error switching tenant:', error);
    return { success: false, error: error.message || 'Failed to switch tenant' };
  }
}

/**
 * Directly check if a specific tenant exists by ID
 * This function is for debugging purposes
 */
export async function checkTenantExists(tenantId: string): Promise<{ 
  exists: boolean; 
  tenant?: any; 
  error?: string;
  rawQuery?: any;
}> {
  try {
    console.log('Directly checking if tenant exists with ID:', tenantId);
    
    // First, try using the db.tenant.findUnique method
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (tenant) {
      console.log('Found tenant using findUnique:', tenant);
      return { exists: true, tenant };
    }
    
    // If that fails, try a direct query with admin permissions
    console.log('Tenant not found with findUnique, trying direct query with admin client...');
    
    // Import the admin client for elevated permissions
    const { createClient: createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();
    
    // Log the raw query details for debugging
    console.log(`Executing raw query with admin privileges: SELECT * FROM tenants WHERE id = '${tenantId}'`);
    
    // Try an exact match with admin client
    const { data: exactMatch, error: exactError } = await adminClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId);
    
    if (exactError) {
      console.error('Error with exact query using admin client:', exactError);
      return { exists: false, error: exactError.message, rawQuery: { method: 'exact', error: exactError } };
    }
    
    if (exactMatch && exactMatch.length > 0) {
      console.log('Found tenant with exact query using admin client:', exactMatch);
      return { exists: true, tenant: exactMatch[0], rawQuery: { method: 'exact', results: exactMatch } };
    }
    
    // Try a case-insensitive search with admin client
    const { data: iexactMatch, error: iexactError } = await adminClient
      .from('tenants')
      .select('*')
      .ilike('id', tenantId);
    
    if (iexactError) {
      console.error('Error with case-insensitive query using admin client:', iexactError);
      return { 
        exists: false, 
        error: iexactError.message, 
        rawQuery: { method: 'ilike', error: iexactError } 
      };
    }
    
    if (iexactMatch && iexactMatch.length > 0) {
      console.log('Found tenant with case-insensitive query using admin client:', iexactMatch);
      return { 
        exists: true, 
        tenant: iexactMatch[0], 
        rawQuery: { method: 'ilike', results: iexactMatch } 
      };
    }
    
    // Try a broader search to see all tenants using admin client
    const { data: allTenants, error: allError } = await adminClient
      .from('tenants')
      .select('*')
      .limit(10);
    
    if (allError) {
      console.error('Error fetching all tenants using admin client:', allError);
      return { 
        exists: false, 
        error: allError.message, 
        rawQuery: { method: 'all', error: allError } 
      };
    }
    
    console.log('All tenants in database (first 10) using admin client:', allTenants);
    
    // Check if the table exists
    const { data: tableInfo, error: tableError } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'tenants')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking if tenants table exists:', tableError);
      return {
        exists: false,
        error: 'Error checking tenants table: ' + tableError.message,
        rawQuery: { table_check: { error: tableError } }
      };
    }
    
    if (!tableInfo || tableInfo.length === 0) {
      return {
        exists: false,
        error: 'The tenants table does not exist in the database',
        rawQuery: { table_check: { exists: false } }
      };
    }
    
    return { 
      exists: false, 
      error: 'Tenant not found in the database using admin privileges', 
      rawQuery: { method: 'all', results: allTenants, table_exists: true } 
    };
  } catch (error: any) {
    console.error('Error checking if tenant exists:', error);
    return { 
      exists: false, 
      error: error.message || 'Failed to check if tenant exists',
      rawQuery: { error: String(error) }
    };
  }
} 