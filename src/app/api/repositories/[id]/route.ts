import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

import db from '@/lib/db';
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

// GET /api/repositories/[id]
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { success, repository, message, status } = await checkRepositoryAccess(
      params.id,
      session.user.id,
    );

    if (!success) {
      return NextResponse.json({ success, message }, { status: status });
    }

    return NextResponse.json(repository);
  } catch (error) {
    console.error('Error fetching repository:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch repository' },
      { status: 500 },
    );
  }
}

// PATCH /api/repositories/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { success, message, status } = await checkRepositoryAccess(params.id, session.user.id);

    if (!success) {
      return NextResponse.json({ success, message }, { status: status });
    }

    const body = await request.json();
    const validatedData = RepositoryUpdateSchema.parse(body);

    // If projectId is provided, verify that the project belongs to the user
    if (validatedData.projectId) {
      const project = await db.project.findUnique({
        where: { id: validatedData.projectId },
      });

      if (!project || project.ownerId !== session.user.id) {
        return NextResponse.json(
          { success: false, message: 'Project not found or not authorized' },
          { status: 403 },
        );
      }
    }

    const repository = await repositoryService.updateRepository(params.id, validatedData);

    return NextResponse.json(repository);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 },
      );
    }

    console.error('Error updating repository:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update repository' },
      { status: 500 },
    );
  }
}

// DELETE /api/repositories/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { success, message, status } = await checkRepositoryAccess(params.id, session.user.id);

    if (!success) {
      return NextResponse.json({ success, message }, { status: status });
    }

    await repositoryService.deleteRepository(params.id);

    return NextResponse.json({ success: true, message: 'Repository deleted successfully' });
  } catch (error) {
    console.error('Error deleting repository:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete repository' },
      { status: 500 },
    );
  }
}
