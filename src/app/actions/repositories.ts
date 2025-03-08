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
    
    const data = await db.repository.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
    
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
