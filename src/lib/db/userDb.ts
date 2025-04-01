/**
 * User Database Layer
 * Handles database operations for users
 */
import { createClient } from '@/lib/supabase/server';

// Types from user service type
import { User, Role } from '@/types/service/userServiceType';

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
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<DbResponse<User>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get user' };
  }
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<DbResponse<User>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get user by email' };
  }
}

/**
 * Create a new user
 */
export async function createUser(user: Partial<User>): Promise<DbResponse<User>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([user])
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create user' };
  }
}

/**
 * Update a user
 */
export async function updateUser(id: string, user: Partial<User>): Promise<DbResponse<User>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .update(user)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update user' };
  }
}

/**
 * Update a user's role
 */
export async function updateUserRole(id: string, role: Role): Promise<DbResponse<User>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update user role' };
  }
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<DbResponse<null>> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}

/**
 * Get a list of all users
 */
export async function getAllUsers(): Promise<DbResponse<User[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get all users' };
  }
}

// Default export for all user database operations
const userDb = {
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  getAllUsers
};

export default userDb;