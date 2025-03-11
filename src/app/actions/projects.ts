'use server';

import db from '@/lib/supabase/db';
import { getUser } from '@/app/actions/user';

export interface Project {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all projects for the current user
 */
export async function getProjects() {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const tenantId = user.user_metadata?.tenant_id || 'default';
    const data = await db.project.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });

    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in getProjects:', error);
    return { success: false, error: error.message || 'Failed to fetch projects', data: null };
  }
}

/**
 * Get a project by ID
 */
export async function getProject(id: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const tenantId = user.user_metadata?.tenant_id || 'default';
    const data = await db.project.findUnique({
      where: {
        id,
        tenant_id: tenantId,
      },
    });

    if (!data) {
      return { success: false, error: 'Project not found', data: null };
    }

    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in getProject:', error);
    return { success: false, error: error.message || 'Failed to fetch project', data: null };
  }
}

/**
 * Create a new project
 */
export async function createProject(
  projectData: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>,
) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const tenantId = user.user_metadata?.tenant_id || 'default';
    const data = await db.project.create({
      data: {
        ...projectData,
        tenant_id: tenantId,
      },
    });

    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in createProject:', error);
    return { success: false, error: error.message || 'Failed to create project', data: null };
  }
}

/**
 * Update an existing project
 */
export async function updateProject(
  id: string,
  projectData: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>>,
) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const tenantId = user.user_metadata?.tenant_id || 'default';
    const data = await db.project.update({
      where: {
        id,
        tenant_id: tenantId,
      },
      data: projectData,
    });

    return { success: true, error: null, data };
  } catch (error: any) {
    console.error('Error in updateProject:', error);
    return { success: false, error: error.message || 'Failed to update project', data: null };
  }
}

/**
 * Delete a project
 */
export async function deleteProject(id: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const tenantId = user.user_metadata?.tenant_id || 'default';
    await db.project.delete({
      where: {
        id,
        tenant_id: tenantId,
      },
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in deleteProject:', error);
    return { success: false, error: error.message || 'Failed to delete project' };
  }
}
