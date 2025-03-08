import { createClient } from '@/lib/supabase/client';

interface Tenant {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export async function getTenants(userId: string): Promise<Tenant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function switchTenant(tenantId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    data: { tenant_id: tenantId }
  });

  if (error) throw error;
  return true;
} 