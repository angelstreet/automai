'use server';

import { db } from '@/lib/supabase/db';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export type UserRole = {
  id: string;
  user_id: string;
  role: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
};

export type UserRoleFilter = {
  user_id?: string;
  role?: string;
};

export async function getUserRoles(filter?: UserRoleFilter) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = {
      where: { tenant_id: user.tenant_id } as any,
      orderBy: { created_at: 'desc' as const }
    };

    if (filter?.user_id) {
      query.where.user_id = filter.user_id;
    }

    if (filter?.role) {
      query.where.role = filter.role;
    }

    const roles = await db.userRole.findMany(query);
    return roles;
  } catch (error) {
    console.error('Error fetching user roles:', error);
    throw new Error('Failed to fetch user roles');
  }
}

export async function createUserRole(data: Partial<UserRole>) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const role = await db.userRole.create({
      data: {
        ...data,
        tenant_id: user.tenant_id
      }
    });

    revalidatePath('/[locale]/[tenant]/users');
    return role;
  } catch (error) {
    console.error('Error creating user role:', error);
    throw new Error('Failed to create user role');
  }
}

export async function updateUserRole(id: string, data: Partial<UserRole>) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const role = await db.userRole.update({
      where: { 
        id,
        tenant_id: user.tenant_id // Ensure tenant isolation
      },
      data
    });

    revalidatePath('/[locale]/[tenant]/users');
    return role;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to update user role');
  }
}

export async function deleteUserRole(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    // Get current user to ensure tenant isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    await db.userRole.delete({
      where: { 
        id,
        tenant_id: user.tenant_id // Ensure tenant isolation
      }
    });

    revalidatePath('/[locale]/[tenant]/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user role:', error);
    throw new Error('Failed to delete user role');
  }
}

// Function to get the current user's roles
export async function getCurrentUserRoles() {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const roles = await db.userRole.findMany({
      where: { 
        user_id: user.id,
        tenant_id: user.tenant_id
      }
    });

    return roles;
  } catch (error) {
    console.error('Error fetching current user roles:', error);
    throw new Error('Failed to fetch current user roles');
  }
}
