'use server';

import db from '@/lib/supabase/db';
import { Repository } from '@/types/repositories';

export interface RepositoryFilter {
  providerId?: string;
}

export async function getRepositories(filter?: RepositoryFilter): Promise<{ success: boolean; error?: string; data?: Repository[] }> {
  try {
    const where: Record<string, any> = {};
    
    if (filter?.providerId) {
      where.provider_id = filter.providerId;
    }
    
    const result = await db.repository.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
    
    // We need to ensure we're working with valid repository objects
    // First convert to unknown to break the typing, then explicitly cast
    const repositories = result as unknown as any[];
    
    // Transform to the correct Repository type
    const data: Repository[] = repositories.map(repo => ({
      id: String(repo.id),
      providerId: String(repo.provider_id),
      name: String(repo.name),
      owner: String(repo.owner),
      url: repo.url ? String(repo.url) : undefined,
      branch: repo.branch ? String(repo.branch) : undefined,
      defaultBranch: repo.default_branch ? String(repo.default_branch) : undefined,
      isPrivate: Boolean(repo.is_private),
      description: repo.description ? String(repo.description) : undefined,
      syncStatus: String(repo.sync_status) as Repository['syncStatus'],
      created_at: new Date(repo.created_at),
      updated_at: new Date(repo.updated_at),
      lastSyncedAt: repo.last_synced_at ? new Date(repo.last_synced_at) : undefined,
      error: repo.error ? String(repo.error) : undefined
    }));
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getRepositories:', error);
    return { success: false, error: error.message || 'Failed to fetch repositories' };
  }
}

export async function createRepository(data: Partial<Repository>): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    const newRepo = await db.repository.create({
      data
    });
    
    return { success: true, data: newRepo };
  } catch (error: any) {
    console.error('Error in createRepository:', error);
    return { success: false, error: error.message || 'Failed to create repository' };
  }
}

export async function updateRepository(id: string, updates: Partial<Repository>): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    const data = await db.repository.update({
      where: { id },
      data: updates
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in updateRepository:', error);
    return { success: false, error: error.message || 'Failed to update repository' };
  }
}

export async function deleteRepository(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.repository.delete({
      where: { id }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteRepository:', error);
    return { success: false, error: error.message || 'Failed to delete repository' };
  }
}

export async function syncRepository(id: string): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    const data = await db.repository.update({
      where: { id },
      data: { last_synced: new Date().toISOString() }
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in syncRepository:', error);
    return { success: false, error: error.message || 'Failed to sync repository' };
  }
}

export async function getRepository(id: string): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    const data = await db.repository.findUnique({
      where: { id }
    });
    
    if (!data) {
      return { success: false, error: 'Repository not found' };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getRepository:', error);
    return { success: false, error: error.message || 'Failed to fetch repository' };
  }
}
