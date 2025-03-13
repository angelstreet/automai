import { NextRequest, NextResponse } from 'next/server';
import { getRepositories, createRepository, createRepositoryFromUrl } from '@/app/[locale]/[tenant]/repositories/actions';

/**
 * GET /api/repositories
 * Get all repositories for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');

    // Call the server action to get repositories
    const result = await getRepositories(providerId ? { providerId } : undefined);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch repositories' },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/repositories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/repositories
 * Create a new repository
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    console.log('[POST /api/repositories] Request body:', body);

    // Check if this is a quick clone request or a regular repository creation
    if (body.quickClone && body.url) {
      console.log('[POST /api/repositories] Processing quick clone request for URL:', body.url);
      // This is a quick clone request - use the specialized function
      const result = await createRepositoryFromUrl(
        body.url,
        body.isPrivate || false,
        body.description
      );
      
      console.log('[POST /api/repositories] Quick clone result:', result);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to create repository from URL' },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      // Regular repository creation
      console.log('[POST /api/repositories] Processing regular repository creation request:', body);
      const result = await createRepository(body);
      
      console.log('[POST /api/repositories] Regular repository creation result:', result);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to create repository' },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in POST /api/repositories:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
