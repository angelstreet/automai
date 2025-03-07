import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Schema for project creation/update
const ProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// GET /api/projects
export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get projects with owner information
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users(id, name, email)
      `)
      .eq('ownerId', session.user.id);
    
    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Projects fetched successfully',
      data: projects || [],
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
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = ProjectSchema.parse(body);

    // Create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        ...validatedData,
        ownerId: session.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
    
    if (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json(
        { success: false, message: 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Project created successfully',
        data: project,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
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
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = request.url.split('/').pop(); // Get the project ID from the URL

    // Check if project exists and user has access
    const { data: existingProject, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (projectError || !existingProject) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    if (existingProject.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        ...body,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update project' },
        { status: 500 }
      );
    }

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
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = request.url.split('/').pop(); // Get the project ID from the URL

    // Check if project exists and user has access
    const { data: existingProject, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (projectError || !existingProject) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    if (existingProject.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete the project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete project' },
        { status: 500 }
      );
    }

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
