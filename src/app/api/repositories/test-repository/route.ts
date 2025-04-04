import { NextRequest, NextResponse } from 'next/server';

import { testGitRepository } from '@/app/actions/repositoriesAction';

export async function POST(req: NextRequest) {
  try {
    // Get repository data from request body
    const { url, token } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    // Test the repository connection using the server action
    const result = await testGitRepository({ url, token });

    // Return appropriate status code based on the test result
    const statusCode = result.success ? 200 : (result.status || 400);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      error: result.error,
      status: result.status
    }, { status: statusCode });
  } catch (error: any) {
    console.error('[@api:repositories:test-repository] Error testing repository:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}