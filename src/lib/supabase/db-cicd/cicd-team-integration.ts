import { cookies } from 'next/headers';

import type { DbResponse } from '@/lib/supabase/db';
import type { CICDProvider } from '@/types/context/cicd';

import { createClient } from '../server';

/**
 * Get all CICD providers for a specific team
 * @param teamId Team ID to filter CICD providers by
 * @param cookieStore Cookie store for authentication
 * @returns CICD providers belonging to the team
 */
export async function getCICDProvidersByTeam(
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<CICDProvider[]>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('cicd_providers')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as CICDProvider[],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch CICD providers by team',
    };
  }
}

/**
 * Create a CICD provider with team association
 * @param providerData CICD provider data to create
 * @param teamId Team ID to associate the CICD provider with
 * @param cookieStore Cookie store for authentication
 * @returns Created CICD provider data
 */
export async function createCICDProviderWithTeam(
  providerData: Omit<CICDProvider, 'id' | 'created_at' | 'updated_at'>,
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<CICDProvider>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('cicd_providers')
      .insert({
        ...providerData,
        team_id: teamId,
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as CICDProvider,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create CICD provider',
    };
  }
}

/**
 * Update a CICD provider's team association
 * @param providerId CICD provider ID to update
 * @param teamId Team ID to associate the CICD provider with
 * @param cookieStore Cookie store for authentication
 * @returns Updated CICD provider data
 */
export async function updateCICDProviderTeam(
  providerId: string,
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<CICDProvider>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('cicd_providers')
      .update({
        team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as CICDProvider,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update CICD provider team',
    };
  }
}
