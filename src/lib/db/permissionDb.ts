/**
 * Permission Database Layer
 * Handles database operations for permissions
 */
import { createClient } from '@/lib/supabase/server';

// Types
import { Operation, ResourceType } from '@/types/context/permissionsContextType';

/**
 * Standard database response interface
 */
export interface DbResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
  count?: number;
}

/**
 * Check if a user has permission for a specific operation on a resource
 */
export async function checkPermission(
  userId: string,
  teamId: string,
  resource: ResourceType,
  operation: Operation
): Promise<DbResponse<boolean>> {
  try {
    const supabase = createClient();
    
    // First, check the user's role in the team
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();
      
    if (teamError) {
      return { success: false, error: teamError.message };
    }
    
    if (!teamMember) {
      return { success: false, error: 'User is not a member of the team' };
    }
    
    // If user is admin or owner, they have all permissions
    if (teamMember.role === 'admin' || teamMember.role === 'owner') {
      return { success: true, data: true };
    }
    
    // Otherwise, check the specific permission
    const { data: permission, error: permissionError } = await supabase
      .from('permissions')
      .select('*')
      .eq('role', teamMember.role)
      .eq('resource', resource)
      .eq('operation', operation)
      .single();
      
    if (permissionError && permissionError.code !== 'PGRST116') { // PGRST116 is "No rows returned" error
      return { success: false, error: permissionError.message };
    }
    
    return { success: true, data: !!permission };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to check permission' };
  }
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(role: string): Promise<DbResponse<any>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('role', role);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Transform the flat list into a structured permission matrix
    const permissionMatrix: Record<ResourceType, Record<Operation, boolean>> = {} as any;
    
    data.forEach((permission: any) => {
      if (!permissionMatrix[permission.resource]) {
        permissionMatrix[permission.resource] = {} as Record<Operation, boolean>;
      }
      
      permissionMatrix[permission.resource][permission.operation] = true;
    });
    
    return { success: true, data: permissionMatrix };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get role permissions' };
  }
}

/**
 * Get all permissions for a user across all teams
 */
export async function getUserPermissions(userId: string): Promise<DbResponse<any>> {
  try {
    const supabase = createClient();
    
    // Get all teams the user is a member of
    const { data: teamMemberships, error: teamError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId);
      
    if (teamError) {
      return { success: false, error: teamError.message };
    }
    
    const permissionsByTeam: Record<string, Record<ResourceType, Record<Operation, boolean>>> = {};
    
    // For each team membership, get the permissions for the user's role
    for (const membership of teamMemberships) {
      const { data: permissions, error: permissionError } = await supabase
        .from('permissions')
        .select('*')
        .eq('role', membership.role);
        
      if (permissionError) {
        console.error(`Error getting permissions for role ${membership.role}:`, permissionError);
        continue;
      }
      
      // Transform permissions into a matrix
      const permissionMatrix: Record<ResourceType, Record<Operation, boolean>> = {} as any;
      
      permissions.forEach((permission: any) => {
        if (!permissionMatrix[permission.resource]) {
          permissionMatrix[permission.resource] = {} as Record<Operation, boolean>;
        }
        
        permissionMatrix[permission.resource][permission.operation] = true;
      });
      
      permissionsByTeam[membership.team_id] = permissionMatrix;
    }
    
    return { success: true, data: permissionsByTeam };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get user permissions' };
  }
}

/**
 * Set a permission for a role
 */
export async function setPermission(
  role: string,
  resource: ResourceType,
  operation: Operation,
  allowed: boolean
): Promise<DbResponse<any>> {
  try {
    const supabase = createClient();
    
    if (allowed) {
      // Insert the permission if it doesn't exist
      const { data, error } = await supabase
        .from('permissions')
        .upsert({
          role,
          resource,
          operation
        })
        .select();
        
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } else {
      // Remove the permission if it exists
      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('role', role)
        .eq('resource', resource)
        .eq('operation', operation);
        
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to set permission' };
  }
}

// Default export for all permission database operations
const permissionDb = {
  checkPermission,
  getRolePermissions,
  getUserPermissions,
  setPermission
};

export default permissionDb;