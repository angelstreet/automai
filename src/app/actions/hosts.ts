'use server';

import { db } from '@/lib/supabase/db';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export type Host = {
  id: string;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  status: 'active' | 'inactive';
};

export type HostFilter = {
  status?: 'active' | 'inactive';
  search?: string;
};

export async function getHosts(filter?: HostFilter) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = {
      where: { tenant_id: user.tenant_id } as any,
      orderBy: { created_at: 'desc' as const }
    };

    if (filter?.status) {
      query.where.status = filter.status;
    }

    const hosts = await db.host.findMany(query);

    // Apply search filter in memory
    if (filter?.search) {
      return hosts.filter(host => 
        host.name.toLowerCase().includes(filter.search!.toLowerCase()) ||
        host.url.toLowerCase().includes(filter.search!.toLowerCase())
      );
    }

    return hosts;
  } catch (error) {
    console.error('Error fetching hosts:', error);
    throw new Error('Failed to fetch hosts');
  }
}

export async function createHost(data: Partial<Host>) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const host = await db.host.create({
      data: {
        ...data,
        tenant_id: user.tenant_id,
        status: data.status || 'active'
      }
    });

    revalidatePath('/[locale]/[tenant]/hosts');
    return host;
  } catch (error) {
    console.error('Error creating host:', error);
    throw new Error('Failed to create host');
  }
}

export async function updateHost(id: string, data: Partial<Host>) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const host = await db.host.update({
      where: { 
        id,
        tenant_id: user.tenant_id // Ensure tenant isolation
      },
      data
    });

    revalidatePath('/[locale]/[tenant]/hosts');
    return host;
  } catch (error) {
    console.error('Error updating host:', error);
    throw new Error('Failed to update host');
  }
}

export async function deleteHost(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await db.host.delete({
      where: { 
        id,
        tenant_id: user.tenant_id // Ensure tenant isolation
      }
    });

    revalidatePath('/[locale]/[tenant]/hosts');
    return { success: true };
  } catch (error) {
    console.error('Error deleting host:', error);
    throw new Error('Failed to delete host');
  }
}
