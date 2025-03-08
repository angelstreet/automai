'use server';

import { db } from '@/lib/supabase/db';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export type Repository = {
  id: string;
  name: string;
  provider_id: string;
  url: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
};

export type RepositoryFilter = {
  provider_ids?: string[];
  search?: string;
};

export async function getRepositories(filter?: RepositoryFilter) {
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

    if (filter?.provider_ids?.length) {
      query.where.provider_id = { in: filter.provider_ids };
    }

    const repositories = await db.repository.findMany(query);

    // Apply search filter in memory since Supabase doesn't support case-insensitive search out of the box
    if (filter?.search) {
      return repositories.filter(repo => 
        repo.name.toLowerCase().includes(filter.search!.toLowerCase())
      );
    }

    return repositories;
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw new Error('Failed to fetch repositories');
  }
}

export async function createRepository(data: Partial<Repository>) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const repository = await db.repository.create({
      data: {
        ...data,
        tenant_id: user.tenant_id
      }
    });

    revalidatePath('/[locale]/[tenant]/repositories');
    return repository;
  } catch (error) {
    console.error('Error creating repository:', error);
    throw new Error('Failed to create repository');
  }
}

export async function updateRepository(id: string, data: Partial<Repository>) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const repository = await db.repository.update({
      where: { 
        id,
        tenant_id: user.tenant_id // Ensure tenant isolation
      },
      data
    });

    revalidatePath('/[locale]/[tenant]/repositories');
    return repository;
  } catch (error) {
    console.error('Error updating repository:', error);
    throw new Error('Failed to update repository');
  }
}

export async function deleteRepository(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await db.repository.delete({
      where: { 
        id,
        tenant_id: user.tenant_id // Ensure tenant isolation
      }
    });

    revalidatePath('/[locale]/[tenant]/repositories');
    return { success: true };
  } catch (error) {
    console.error('Error deleting repository:', error);
    throw new Error('Failed to delete repository');
  }
}
