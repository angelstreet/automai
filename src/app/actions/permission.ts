'use server';

import {
  ResourceType,
  Operation,
  PermissionMatrix,
  checkPermission as dbCheckPermission,
  getUserPermissions as dbGetUserPermissions,
  PermissionsResult,
} from '@/lib/supabase/db-teams/permissions';

/**
 * Get all permissions for a user in a specific team
 */
export async function getUserPermissions(
  profileId: string,
  teamId: string,
): Promise<PermissionsResult> {
  return dbGetUserPermissions(profileId, teamId);
}

/**
 * Check if a user has permission for a specific operation on a resource type
 */
export async function checkPermission(
  profileId: string,
  teamId: string,
  resourceType: ResourceType,
  operation: Operation,
  creatorId?: string,
): Promise<boolean> {
  return dbCheckPermission(profileId, teamId, resourceType, operation, creatorId);
}

// Export types for client usage
export type { ResourceType, Operation, PermissionMatrix, PermissionsResult };
