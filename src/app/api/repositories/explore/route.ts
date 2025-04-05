import { NextRequest, NextResponse } from 'next/server';

import { getRepositoryFiles, getRepositoryFileContent } from '@/app/actions/repositoriesAction';

/**
 * GET /api/repositories/explore
 * Endpoint to explore repository files
 * Uses the server action getRepositoryFiles to handle the business logic
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const repositoryId = url.searchParams.get('repositoryId');
    const path = url.searchParams.get('path') || '';
    const branch = url.searchParams.get('branch') || 'main';
    const action = url.searchParams.get('action') || 'list'; // Get the action parameter

    // Validate required parameters
    if (!repositoryId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 },
      );
    }

    console.log(
      `[API] /api/repositories/explore - repositoryId: ${repositoryId}, path: ${path}, branch: ${branch}, action: ${action}`,
    );

    // Based on the action parameter, call the appropriate server action
    if (action === 'file') {
      // For file content requests, use getRepositoryFileContent
      const result = await getRepositoryFileContent(repositoryId, path, branch);

      if (!result.success) {
        // Determine appropriate status code based on error
        let statusCode = 500;

        if (result.error === 'Unauthorized') {
          statusCode = 401;
        } else if (result.error === 'Repository not found' || result.error === 'File not found') {
          statusCode = 404;
        }

        return NextResponse.json({ success: false, error: result.error }, { status: statusCode });
      }

      // Return file content response
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      // For directory listing requests, use getRepositoryFiles
      const result = await getRepositoryFiles(repositoryId, path, branch);

      if (!result.success) {
        // Determine appropriate status code based on error
        let statusCode = 500;

        if (result.error === 'Unauthorized') {
          statusCode = 401;
        } else if (result.error === 'Repository not found') {
          statusCode = 404;
        }

        return NextResponse.json({ success: false, error: result.error }, { status: statusCode });
      }

      // Return directory listing response
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }
  } catch (error: any) {
    console.error('[API] /api/repositories/explore - Error:', error);

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
