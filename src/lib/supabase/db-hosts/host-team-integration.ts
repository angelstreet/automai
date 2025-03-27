import { createClient } from '../server';
import { cookies } from 'next/headers';
import type { DbResponse } from '@/lib/supabase/db';
import type { Host } from '@/app/[locale]/[tenant]/hosts/types';

/**
 * Get all hosts for a specific team
 * @param teamId Team ID to filter hosts by
 * @param cookieStore Cookie store for authentication
 * @returns Hosts belonging to the team
 */
export async function getHostsByTeam(
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<Host[]>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('hosts')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Host[],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch hosts by team',
    };
  }
}

/**
 * Create a host with team association
 * @param hostData Host data to create
 * @param teamId Team ID to associate the host with
 * @param cookieStore Cookie store for authentication
 * @returns Created host data
 */
export async function createHostWithTeam(
  hostData: Omit<Host, 'id' | 'created_at' | 'updated_at'>,
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<Host>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('hosts')
      .insert({
        ...hostData,
        team_id: teamId,
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Host,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create host',
    };
  }
}

/**
 * Update a host's team association
 * @param hostId Host ID to update
 * @param teamId Team ID to associate the host with
 * @param cookieStore Cookie store for authentication
 * @returns Updated host data
 */
export async function updateHostTeam(
  hostId: string,
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<Host>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('hosts')
      .update({
        team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hostId)
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Host,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update host team',
    };
  }
}
