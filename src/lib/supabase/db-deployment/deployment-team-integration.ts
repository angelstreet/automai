import { cookies } from 'next/headers';

import type { DbResponse } from '@/lib/supabase/db';
import type { Deployment } from '@/types/context/deployment';

import { createClient } from '../server';

/**
 * Get all deployments for a specific team
 * @param teamId Team ID to filter deployments by
 * @param cookieStore Cookie store for authentication
 * @returns Deployments belonging to the team
 */
export async function getDeploymentsByTeam(
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<Deployment[]>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Deployment[],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch deployments by team',
    };
  }
}

/**
 * Create a deployment with team association
 * @param deploymentData Deployment data to create
 * @param teamId Team ID to associate the deployment with
 * @param cookieStore Cookie store for authentication
 * @returns Created deployment data
 */
export async function createDeploymentWithTeam(
  deploymentData: Omit<Deployment, 'id' | 'created_at' | 'updated_at'>,
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('deployments')
      .insert({
        ...deploymentData,
        team_id: teamId,
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Deployment,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create deployment',
    };
  }
}

/**
 * Update a deployment's team association
 * @param deploymentId Deployment ID to update
 * @param teamId Team ID to associate the deployment with
 * @param cookieStore Cookie store for authentication
 * @returns Updated deployment data
 */
export async function updateDeploymentTeam(
  deploymentId: string,
  teamId: string,
  cookieStore = cookies(),
): Promise<DbResponse<Deployment>> {
  try {
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('deployments')
      .update({
        team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deploymentId)
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as Deployment,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update deployment team',
    };
  }
}
