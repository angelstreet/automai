'use server';

import db from '@/lib/supabase/db';
import { supabaseAuth } from '@/lib/supabase/auth';

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
    
    if (!tenantId) {
      console.log('getTenants: No tenant_id in metadata, getting all tenants');
      // If no tenant_id in metadata, get all tenants (or default)
      const data = await db.tenant.findMany({
        orderBy: { created_at: 'desc' }
      });
      
      return { success: true, data };
    }
    
    // Get the specific tenant
    console.log('getTenants: Getting specific tenant by ID:', tenantId);
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      console.log('getTenants: Tenant not found, getting all tenants');
      // If tenant not found, get all tenants
      const data = await db.tenant.findMany({
        orderBy: { created_at: 'desc' }
      });
      
      return { success: true, data };
    }
    
    console.log('getTenants: Found tenant:', tenant);
    // Return the tenant as an array
    return { success: true, data: [tenant] };
  } catch (error: any) {
    console.error('Error in getTenants:', error);
    return { success: false, error: error.message || 'Failed to fetch tenants' };
  }
}

export async function switchTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('switchTenant: Switching to tenant ID:', tenantId);
    
    // Get the tenant name from the database
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      console.log('switchTenant: Tenant not found');
      return { success: false, error: 'Tenant not found' };
    }
    
    console.log('switchTenant: Found tenant:', tenant);
    
    // Update the user profile with both tenant_id and tenant_name
    const result = await supabaseAuth.updateProfile({ 
      tenant_id: tenantId,
      tenant_name: tenant.name
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