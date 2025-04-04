import { NextRequest, NextResponse } from 'next/server';

import { testGitProvider } from '@/app/actions/repositoriesAction';

export async function POST(req: NextRequest) {
  try {
    // Get provider data from request body
    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider data is required' },
        { status: 400 }
      );
    }

    // Test the Git provider connection using the server action
    const result = await testGitProvider(provider);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        message: result.message
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Connection test failed' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[@api:repositories:test-connection] Error testing connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}