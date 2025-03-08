import { NextRequest, NextResponse } from 'next/server';
import { 
  getProject, 
  updateProject, 
  deleteProject 
} from '@/app/actions/projects';

type Props = {
  params: { id: string };
};


/**
 * GET /api/projects/[id]
 * Get a project by ID
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;
    
    // Call the server action to get project
    const result = await getProject(id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch project' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]
 * Update a project by ID
 */
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;
    
    // Parse request body
    const body = await request.json();
    
    // Call the server action to update project
    const result = await updateProject(id, body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update project' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in PATCH /api/projects/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project by ID
 */
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;
    
    // Call the server action to delete project
    const result = await deleteProject(id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete project' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
