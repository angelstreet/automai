import { createClient } from '../server';
import { cookies } from 'next/headers';
import type { DbResponse } from '@/lib/supabase/db';
import type { Repository } from '@/types/context/repository';

/**
 * Get all repositories for a specific team
 * @param teamId Team ID to filter repositories by
 * @param cookieStore Cookie store for authentication
 * @returns Repositories belonging to the team
 */
export async function getRepositoriesByTeam(
  teamId: string,
  cookieStore = cookies()
): Promise<DbResponse<Repository[]>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Repository[],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch repositories by team',
    };
  }
}

/**
 * Create a repository with team association
 * @param repoData Repository data to create
 * @param teamId Team ID to associate the repository with
 * @param cookieStore Cookie store for authentication
 * @returns Created repository data
 */
export async function createRepositoryWithTeam(
  repoData: Omit<Repository, 'id' | 'created_at' | 'updated_at'>,
  teamId: string,
  cookieStore = cookies()
): Promise<DbResponse<Repository>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('repositories')
      .insert({
        ...repoData,
        team_id: teamId,
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Repository,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create repository',
    };
  }
}

/**
 * Update a repository's team association
 * @param repoId Repository ID to update
 * @param teamId Team ID to associate the repository with
 * @param cookieStore Cookie store for authentication
 * @returns Updated repository data
 */
export async function updateRepositoryTeam(
  repoId: string,
  teamId: string,
  cookieStore = cookies()
): Promise<DbResponse<Repository>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('repositories')
      .update({
        team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', repoId)
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Repository,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update repository team',
    };
  }
}