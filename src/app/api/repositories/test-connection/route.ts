import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/app/actions/git-providers';

/**
 * POST /api/repositories/test-connection
 * Test a connection to a git provider
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Call the server action to test connection
    const result = await testConnection(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to test connection' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message || 'Connection test successful'
    });
  } catch (error) {
    console.error('Error in POST /api/repositories/test-connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
