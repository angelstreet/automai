import { NextRequest, NextResponse } from 'next/server';

import { testGitRepository } from '@/app/actions/repositoriesAction';

export async function POST(req: NextRequest) {
  try {
    // Get repository data from request body
    const data = await req.json();

    if (!data.url) {
      return NextResponse.json(
        { success: false, error: 'Repository URL is required' },
        { status: 400 },
      );
    }

    console.log('[@api:repositories:test-repository] Testing repository URL:', data.url);

    // Test the repository connection using the server action
    const result = await testGitRepository({
      url: data.url,
      token: data.token || '',
    });

    // Return appropriate status code based on the test result
    const statusCode = result.success ? 200 : result.status || 400;

    console.log('[@api:repositories:test-repository] Test result:', {
      success: result.success,
      status: statusCode,
      error: result.error,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        error: result.error,
        status: result.status,
      },
      { status: statusCode },
    );
  } catch (error: any) {
    console.error('[@api:repositories:test-repository] Error testing repository:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
