import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import db from '@/lib/db';
import * as repositoryService from '@/lib/services/repositories';

// Schema for repository creation
const RepositoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  url: z.string().url('Valid URL is required'),
  defaultBranch: z.string().optional(),
  providerId: z.string().min(1, 'Provider ID is required'),
  projectId: z.string().optional(),
});

// GET /api/repositories
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const syncStatus = searchParams.get('syncStatus') || undefined;

    const repositories = await repositoryService.listRepositories(session.user.id, {
      providerId,
      projectId,
      syncStatus: syncStatus as any,
    });

    return NextResponse.json(repositories);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch repositories' },
      { status: 500 },
    );
  }
}

// POST /api/repositories
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = RepositoryCreateSchema.parse(body);

    // Verify that the provider belongs to the user
    const provider = await db.gitProvider.findUnique({
      where: { id: validatedData.providerId },
    });

    if (!provider || provider.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Provider not found or not authorized' },
        { status: 403 },
      );
    }

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

    const repository = await repositoryService.createRepository(validatedData);

    return NextResponse.json(repository, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 },
      );
    }

    console.error('Error creating repository:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create repository' },
      { status: 500 },
    );
  }
}
