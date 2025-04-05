import { NextRequest, NextResponse } from 'next/server';

import { connectRepository, testGitRepository } from '@/app/actions/repositoriesAction';

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

    console.log('[@api:repositories:test-connection] Processing request for URL:', data.url);

    // Step 1: Test repository access before adding to database
    const testResult = await testGitRepository({
      url: data.url,
      token: data.token || '',
    });

    if (!testResult.success) {
      console.log('[@api:repositories:test-connection] Repository test failed:', testResult.error);
      return NextResponse.json(
        {
          success: false,
          error: testResult.error || 'Repository is not accessible',
        },
        { status: 400 },
      );
    }

    console.log(
      '[@api:repositories:test-connection] Repository test successful, proceeding to add to database',
    );

    // Step 2: Add repository to database
    const result = await connectRepository(data);

    if (!result.success) {
      console.log(
        '[@api:repositories:test-connection] Failed to connect repository:',
        result.error,
      );
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to connect repository' },
        { status: 400 },
      );
    }

    console.log(
      '[@api:repositories:test-connection] Successfully connected repository:',
      result.data?.id,
    );

    // Return success response
    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Repository successfully connected',
    });
  } catch (error: any) {
    console.error('[@api:repositories:test-connection] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
