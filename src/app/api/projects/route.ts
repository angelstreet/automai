import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject, updateProject, deleteProject } from '@/app/actions/projects';

/**
 * GET /api/projects
 * Get all projects for the current user
 */
export async function GET() {
  try {
    // Call the server action to get projects
    const result = await getProjects();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch projects' },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Call the server action to create project
    const result = await createProject(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create project' },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id]
export async function PATCH(request: Request) {
  try {
    // If Supabase client is null, fall back to a simple check
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication not available',
        },
        { status: 401 },
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = request.url.split('/').pop(); // Get the project ID from the URL

    // Check if project exists and user has access
    const existingProject = await db.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    if (existingProject.ownerId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const updatedProject = await db.project.update({
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
    // If Supabase client is null, fall back to a simple check
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication not available',
        },
        { status: 401 },
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const id = request.url.split('/').pop(); // Get the project ID from the URL

    // Check if project exists and user has access
    const existingProject = await db.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    if (existingProject.ownerId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    await db.project.delete({
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
