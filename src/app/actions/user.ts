'use server';

import db from '@/lib/supabase/db';
import { supabaseAuth } from '@/lib/supabase/auth';
import { UserRole, UserRoleResponse, SingleUserRoleResponse, UserRoleFilter } from '@/types/user';

export async function getUserRoles(userId: string): Promise<UserRoleResponse> {
  try {
    // Get the user from the users table
    const users = await db.query('users', {
      where: { id: userId }
    });
    
    if (!users || users.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    const user = users[0];
    
    // Create a UserRole object from the user's role
    const userRole: UserRole = {
      id: userId, // Using userId as the role ID for simplicity
      name: user.role || 'user', // Default to 'user' if role is not set
      created_at: user.createdAt || new Date().toISOString(),
      updated_at: user.updatedAt || new Date().toISOString()
    };
    
    return { success: true, data: [userRole] };
  } catch (error: any) {
    console.error('Error in getUserRoles:', error);
    return { success: false, error: error.message || 'Failed to fetch user roles' };
  }
}

export async function createUserRole(data: Partial<UserRole>): Promise<SingleUserRoleResponse> {
  try {
    // This function would update the user's role in the users table
    if (!data.id) {
      return { success: false, error: 'User ID is required' };
    }
    
    const result = await db.user.update({
      where: { id: data.id },
      data: { role: data.name }
    });
    
    if (!result) {
      return { success: false, error: 'Failed to update user role' };
    }
    
    const userRole: UserRole = {
      id: data.id,
      name: data.name || 'user',
      created_at: result.createdAt || new Date().toISOString(),
      updated_at: result.updatedAt || new Date().toISOString()
    };
    
    return { success: true, data: userRole };
  } catch (error: any) {
    console.error('Error in createUserRole:', error);
    return { success: false, error: error.message || 'Failed to create user role' };
  }
}

export async function updateUserRole(id: string, updates: Partial<UserRole>): Promise<SingleUserRoleResponse> {
  try {
    // This function would update the user's role in the users table
    const result = await db.user.update({
      where: { id },
      data: { role: updates.name }
    });
    
    if (!result) {
      return { success: false, error: 'Failed to update user role' };
    }
    
    const userRole: UserRole = {
      id,
      name: updates.name || result.role || 'user',
      created_at: result.createdAt || new Date().toISOString(),
      updated_at: result.updatedAt || new Date().toISOString()
    };
    
    return { success: true, data: userRole };
  } catch (error: any) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: error.message || 'Failed to update user role' };
  }
}

export async function deleteUserRole(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Instead of deleting, we'll reset the role to 'user'
    await db.user.update({
      where: { id },
      data: { role: 'user' }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteUserRole:', error);
    return { success: false, error: error.message || 'Failed to delete user role' };
  }
}

export async function getCurrentUserRoles(): Promise<UserRoleResponse> {
  try {
    const userResult = await supabaseAuth.getUser();
    
    if (!userResult.success || !userResult.data) {
      // Return a default role for unauthenticated users instead of an error
      if (userResult.error === 'Auth session missing!' || userResult.error === 'No active session') {
        return { 
          success: true, 
          data: [{ 
            id: 'guest', 
            name: 'guest',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }] 
        };
      }
      return { success: false, error: 'No user found' };
    }
    
    return getUserRoles(userResult.data.id);
  } catch (error: any) {
    console.error('Error in getCurrentUserRoles:', error);
    return { success: false, error: error.message || 'Failed to get current user roles' };
  }
}
