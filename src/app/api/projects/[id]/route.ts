import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

import db from '@/lib/db';

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
    const cookieStore = cookies();
    const supabase = await createServerClient(cookieStore);
    
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

    // Get the project with owner and testcases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users(id, name, email),
        testcases(*)
      `)
      .eq('id', id)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this project
    if (project.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
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
    const cookieStore = cookies();
    const supabase = await createServerClient(cookieStore);
    
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
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update({
        ...validatedData,
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
      data: project,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
    const cookieStore = cookies();
    const supabase = await createServerClient(cookieStore);
    
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
