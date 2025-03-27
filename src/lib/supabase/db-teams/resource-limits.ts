import { createClient } from "@/lib/supabase/client";
import { cookies } from "next/headers";
import type { DbResponse } from "@/lib/supabase/db";

export interface ResourceLimitCheck {
  canCreate: boolean;
  current: number;
  limit: number;
  isUnlimited: boolean;
}

/**
 * Check if a tenant can create more of a specific resource type
 * @param tenantId Tenant ID to check resource limits for
 * @param resourceType Type of resource to check (hosts, repositories, deployments, cicd_providers)
 * @param cookieStore Cookie store for authentication
 * @returns Resource limit check result with current count, limit, and availability
 */
export async function checkResourceLimit(
  tenantId: string,
  resourceType: string,
  cookieStore = cookies()
): Promise<DbResponse<ResourceLimitCheck>> {
  try {
    const supabase = createClient(cookieStore);

    // Get the tenant's subscription tier
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .select("subscription_tier_id")
      .eq("id", tenantId)
      .single();

    if (tenantError) {
      return {
        success: false,
        error: tenantError.message,
      };
    }

    const tierId = tenantData.subscription_tier_id;

    // Get the resource limit for this tier and resource type
    const { data: limitData, error: limitError } = await supabase
      .from("resource_limits")
      .select("max_count, is_unlimited")
      .eq("tier_id", tierId)
      .eq("resource_type", resourceType)
      .single();

    if (limitError) {
      return {
        success: false,
        error: `No limit configured for ${resourceType}`,
      };
    }

    // If resource is unlimited, no need to count
    if (limitData.is_unlimited) {
      return {
        success: true,
        data: {
          canCreate: true,
          current: 0,
          limit: 0,
          isUnlimited: true,
        },
      };
    }

    // Count current resources
    let currentCount = 0;
    const { count, error: countError } = await supabase
      .from(resourceType)
      .select("id", { count: 'exact', head: true })
      .eq("tenant_id", tenantId);

    if (countError) {
      return {
        success: false,
        error: countError.message,
      };
    }

    currentCount = count || 0;

    return {
      success: true,
      data: {
        canCreate: currentCount < limitData.max_count,
        current: currentCount,
        limit: limitData.max_count,
        isUnlimited: false,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || `Failed to check resource limit for ${resourceType}`,
    };
  }
}