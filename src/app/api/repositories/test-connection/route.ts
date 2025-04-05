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

    console.log('[@api:repositories:test-connection] Testing repository URL:', data.url);

    // Test the repository connection using the server action
    const result = await testGitRepository({
      url: data.url,
      token: data.token || '',
    });

    // Return appropriate response based on the test result
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'Repository is accessible',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Repository is not accessible',
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error('[@api:repositories:test-connection] Error testing repository:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
