import { NextResponse } from 'next/server';

/* eslint-disable unused-imports/no-unused-vars */
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{ id: string }>;
};

const ProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// GET /api/projects/[id]
export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id: id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        testcases: true,
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    // Check if user has access to this project
    if (_project.ownerId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Project fetched successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch project' },
      { status: 500 },
    );
  }
}

// PATCH /api/projects/[id]
export async function PATCH(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = ProjectSchema.parse(body);

    // Check if project exists and user has access
    const existingProject = await prisma.project.findUnique({
      where: { id: id },
    });

    if (!existingProject) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    if (existingProject.ownerId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const project = await prisma.project.update({
      where: { id: id },
      data: validatedData,
    });

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  } catch (error) {
    if (_error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 },
      );
    }

    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update project' },
      { status: 500 },
    );
  }
}

// DELETE /api/projects/[id]
export async function DELETE(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Check if project exists and user has access
    const existingProject = await prisma.project.findUnique({
      where: { id: id },
    });

    if (!existingProject) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    if (existingProject.ownerId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete project' },
      { status: 500 },
    );
  }
}
