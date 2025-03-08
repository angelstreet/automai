'use server';

import db from '@/lib/supabase/db';
import { supabaseAuth } from '@/lib/supabase/auth';

export interface UserRole {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleFilter {
  userId?: string;
}

export async function getUserRoles(userId: string): Promise<{ success: boolean; error?: string; data?: UserRole[] }> {
  try {
    const data = await db.query('user_roles', {
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getUserRoles:', error);
    return { success: false, error: error.message || 'Failed to fetch user roles' };
  }
}

export async function createUserRole(data: Partial<UserRole>): Promise<{ success: boolean; error?: string; data?: UserRole }> {
  try {
    // Note: We're using a simplified approach since user_roles doesn't have a specific model in db.ts
    const result = await db.query('user_roles_insert', {
      data
    });
    
    if (!result || !result[0]) {
      return { success: false, error: 'Failed to create user role' };
    }
    
    return { success: true, data: result[0] };
  } catch (error: any) {
    console.error('Error in createUserRole:', error);
    return { success: false, error: error.message || 'Failed to create user role' };
  }
}

export async function updateUserRole(id: string, updates: Partial<UserRole>): Promise<{ success: boolean; error?: string; data?: UserRole }> {
  try {
    // Note: Using query directly since user_roles doesn't have a specific model
    const result = await db.query('user_roles_update', {
      where: { id },
      data: updates
    });
    
    if (!result || !result[0]) {
      return { success: false, error: 'Failed to update user role' };
    }
    
    return { success: true, data: result[0] };
  } catch (error: any) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: error.message || 'Failed to update user role' };
  }
}

export async function deleteUserRole(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.query('user_roles_delete', {
      where: { id }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteUserRole:', error);
    return { success: false, error: error.message || 'Failed to delete user role' };
  }
}

export async function getCurrentUserRoles(): Promise<{ success: boolean; error?: string; data?: UserRole[] }> {
  try {
    const userResult = await supabaseAuth.getUser();
    
    if (!userResult.success || !userResult.data) {
      return { success: false, error: 'No user found' };
    }
    
    return getUserRoles(userResult.data.id);
  } catch (error: any) {
    console.error('Error in getCurrentUserRoles:', error);
    return { success: false, error: error.message || 'Failed to get current user roles' };
  }
}
