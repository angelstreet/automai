import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { ResourceType } from './permissions';

export interface ResourceLimit {
  id: string;
  tier_id: string;
  resource_type: ResourceType;
  max_count: number;
  is_unlimited: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceLimitCheck {
  allowed: boolean;
  current: number;
  maximum: number | 'unlimited';
  message: string;
}

export type ResourceLimitsResult = {
  success: boolean;
  data?: ResourceLimit[];
  error?: string;
};

export type ResourceLimitResult = {
  success: boolean;
  data?: ResourceLimit;
  error?: string;
};

export type ResourceLimitCheckResult = {
  success: boolean;
  data?: ResourceLimitCheck;
  error?: string;
};

// Function to get supabase client
async function getSupabaseClient() {
  const cookieStore = cookies();
  return await createServerClient(cookieStore);
}

/**
 * Get all resource limits for a subscription tier
 */
export async function getResourceLimits(tierId: string): Promise<ResourceLimitsResult> {
  try {
    const { data, error } = await supabase
      .from('resource_limits')
      .select('*')
      .eq('tier_id', tierId);

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching resource limits:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch resource limits',
    };
  }
}

/**
 * Get a specific resource limit
 */
export async function getResourceLimit(
  tierId: string,
  resourceType: ResourceType,
): Promise<ResourceLimitResult> {
  try {
    const { data, error } = await supabase
      .from('resource_limits')
      .select('*')
      .eq('tier_id', tierId)
      .eq('resource_type', resourceType)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching resource limit:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to fetch resource limit',
    };
  }
}

/**
 * Check if a resource limit is reached for a tenant
 */
export async function checkResourceLimit(
  tenantId: string,
  resourceType: string,
): Promise<ResourceLimitResult> {
  try {
    // Call the RPC function to check the resource limit
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc('check_resource_limit', {
      p_tenant_id: tenantId,
      p_resource_type: resourceType,
    });

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`Error checking resource limit for ${resourceType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check resource limit',
    };
  }
}

/**
 * Update a resource limit
 */
export async function updateResourceLimit(
  tierId: string,
  resourceType: ResourceType,
  maxCount: number,
  isUnlimited: boolean,
): Promise<ResourceLimitResult> {
  try {
    // Check if resource limit exists
    const { data: existingLimit, error: fetchError } = await supabase
      .from('resource_limits')
      .select('id')
      .eq('tier_id', tierId)
      .eq('resource_type', resourceType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "no rows returned"
      throw fetchError;
    }

    let data, error;

    if (existingLimit) {
      // Update existing resource limit
      const result = await supabase
        .from('resource_limits')
        .update({
          max_count: maxCount,
          is_unlimited: isUnlimited,
        })
        .eq('id', existingLimit.id)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      // Insert new resource limit
      const result = await supabase
        .from('resource_limits')
        .insert({
          tier_id: tierId,
          resource_type: resourceType,
          max_count: maxCount,
          is_unlimited: isUnlimited,
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error updating resource limit:', error);
    return {
      success: false,
      error: (error as PostgrestError).message || 'Failed to update resource limit',
    };
  }
}
