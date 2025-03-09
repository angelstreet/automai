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
    
    if (!tenantId) {
      // If no tenant_id in metadata, get all tenants (or default)
      const data = await db.tenant.findMany({
        orderBy: { created_at: 'desc' }
      });
      
      return { success: true, data };
    }
    
    // Get the specific tenant
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      // If tenant not found, get all tenants
      const data = await db.tenant.findMany({
        orderBy: { created_at: 'desc' }
      });
      
      return { success: true, data };
    }
    
    // Return the tenant as an array
    return { success: true, data: [tenant] };
  } catch (error: any) {
    console.error('Error in getTenants:', error);
    return { success: false, error: error.message || 'Failed to fetch tenants' };
  }
}

export async function switchTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await supabaseAuth.updateProfile({ tenant_id: tenantId });
    
    return { 
      success: result.success, 
      error: result.error || undefined 
    };
  } catch (error: any) {
    console.error('Error switching tenant:', error);
    return { success: false, error: error.message || 'Failed to switch tenant' };
  }
} 