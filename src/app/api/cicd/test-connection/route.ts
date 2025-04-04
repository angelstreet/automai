import { NextRequest, NextResponse } from 'next/server';

import { testCICDProvider } from '@/app/actions/cicdAction';

export async function POST(req: NextRequest) {
  try {
    // Get the provider from the request body
    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider data is required' },
        { status: 400 },
      );
    }

    // Test the CI/CD provider connection using the server action
    const result = await testCICDProvider(provider);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Connection test failed' },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error('[@api:cicd:test-connection] Error testing connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
