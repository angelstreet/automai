import { NextRequest, NextResponse } from 'next/server';
import { 
  getRepository, 
  updateRepository, 
  deleteRepository 
} from '@/app/actions/repositories';

import { z } from 'zod';

import db from '@/lib/supabase/db';
import * as repositoryService from '@/lib/services/repositories';

// Schema for repository update
const RepositoryUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  defaultBranch: z.string().optional(),
  projectId: z.string().optional().nullable(),
});

// Helper to check if user has access to the repository
async function checkRepositoryAccess(id: string, userId: string) {
  const repository = await db.repository.findUnique({
    where: { id },
    include: {
      provider: true,
    },
  });

  if (!repository) {
    return { success: false, message: 'Repository not found', status: 404 };
  }

  if (repository.provider.userId !== userId) {
    return { success: false, message: 'Not authorized to access this repository', status: 403 };
  }

  return { success: true, repository };
}

type Props = {
  params: { id: string };
};

/**
 * GET /api/repositories/[id]
 * Get a repository by ID
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;
    
    // Call the server action to get repository
    const result = await getRepository(id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch repository' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/repositories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/repositories/[id]
 * Update a repository by ID
 */
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;
    
    // Parse request body
    const body = await request.json();
    
    // Call the server action to update repository
    const result = await updateRepository(id, body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update repository' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in PATCH /api/repositories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/repositories/[id]
 * Delete a repository by ID
 */
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;
    
    // Call the server action to delete repository
    const result = await deleteRepository(id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete repository' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Repository deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/repositories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
