// ARCHIVED: This API route was archived on 2025-03-31T09:42:38.760Z
// Original path: src/app/api/repositories/test-connection/route.ts
// Route: /repositories/test-connection
// This file is preserved for reference purposes only and is no longer in use.

import { NextRequest, NextResponse } from 'next/server';

import { testGitProviderConnection } from '@/app/actions/repositories';

/**
 * POST /api/repositories/test-connection
 * Test a connection to a git provider
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Call the server action to test connection
    const result = await testGitProviderConnection(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to test connection' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Connection test successful',
    });
  } catch (error) {
    console.error('Error in POST /api/repositories/test-connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
