'use server';

import { cookies } from 'next/headers';
import { cache } from 'react';

import permissionDb from '@/lib/db/permissionDb';
import type {
  ResourceType,
  Operation,
  PermissionMatrix,
  PermissionsResult,
} from '@/types/context/permissionsContextType';

/**
 * Get all permissions for a user in a specific team
 * Cached for better performance
 * Use this in layout and client components
 */
export const getUserPermissions = cache(
  async (profileId: string, teamId?: string | null): Promise<PermissionsResult | null> => {
    // Return null if either parameter is missing
    if (!profileId || !teamId) {
      console.log(
        `[@action:permission:getUserPermissions] Missing profileId or teamId, returning null`,
      );
      return null;
    }

    try {
      console.log(
        `[@action:permission:getUserPermissions] Getting permissions for profile: ${profileId}, team: ${teamId}`,
      );
      const cookieStore = await cookies();
      const result = await permissionDb.getUserPermissions(profileId, teamId, cookieStore);
      console.log(`[@action:permission:getUserPermissions] Successfully retrieved permissions`);
      return result;
    } catch (error) {
      console.error(`[@action:permission:getUserPermissions] Error getting permissions:`, error);
      return { success: false, error: 'Failed to retrieve permissions' };
    }
  },
);

/**
 * Check if a user has permission for a specific operation on a resource type
 * Cached for better performance
 */
export const checkPermission = cache(
  async (
    profileId: string,
    teamId: string,
    resourceType: ResourceType,
    operation: Operation,
    creatorId?: string,
  ): Promise<boolean> => {
    try {
      console.log(
        `[@action:permission:checkPermission] Checking permission for profile: ${profileId}, team: ${teamId}, resource: ${resourceType}, operation: ${operation}`,
      );
      const cookieStore = await cookies();
      const hasPermission = await permissionDb.checkPermission(
        profileId,
        teamId,
        resourceType,
        operation,
        creatorId,
        cookieStore,
      );
      console.log(`[@action:permission:checkPermission] Permission check result: ${hasPermission}`);
      return hasPermission;
    } catch (error) {
      console.error(`[@action:permission:checkPermission] Error checking permission:`, error);
      return false;
    }
  },
);

/**
 * Get all permissions for the current user across all teams
 * Cached for better performance
 */
export const getCurrentUserPermissions = cache(
  async (): Promise<{
    [teamId: string]: PermissionsResult;
  }> => {
    try {
      console.log(
        `[@action:permission:getCurrentUserPermissions] Getting permissions for current user`,
      );
      // This would need to be implemented in the DB layer
      // For now, returning an empty object as placeholder
      return {};
    } catch (error) {
      console.error(
        `[@action:permission:getCurrentUserPermissions] Error getting current user permissions:`,
        error,
      );
      return {};
    }
  },
);

// Export types for client usage
export type { ResourceType, Operation, PermissionMatrix, PermissionsResult };
