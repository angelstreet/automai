import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

// Schema for project creation/update
const ProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// GET /api/projects
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { ownerId: session.user.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Projects fetched successfully',
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch projects' },
      { status: 500 },
    );
  }
}

// POST /api/projects
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = ProjectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        ownerId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Project created successfully',
        data: project,
      },
      { status: 201 },
    );
  } catch (error) {
    if (_error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 },
      );
    }

    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create project' },
      { status: 500 },
    );
  }
}

// PATCH /api/projects/[id]
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = request.url.split('/').pop(); // Get the project ID from the URL

    // Check if project exists and user has access
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    if (existingProject.ownerId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update project' },
      { status: 500 },
    );
  }
}

// DELETE /api/projects/[id]
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const id = request.url.split('/').pop(); // Get the project ID from the URL

    // Check if project exists and user has access
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    if (existingProject.ownerId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id },
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
