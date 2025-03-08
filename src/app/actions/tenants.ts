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
    const data = await db.tenant.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    
    return { success: true, data };
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