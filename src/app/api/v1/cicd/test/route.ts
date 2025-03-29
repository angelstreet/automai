import { NextRequest, NextResponse } from 'next/server';

import { testJenkinsAPI } from '@/app/actions/cicd';

/**
 * API route to test the Jenkins API connection
 */
export async function GET(req: NextRequest) {
  try {
    console.log('API: Testing Jenkins API connection');

    // Call the testJenkinsAPI function
    const result = await testJenkinsAPI();

    // Return the result
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API: Error testing Jenkins API connection:', error);

    // Return error
    return NextResponse.json(
      { success: false, error: error.message || 'Error testing Jenkins API connection' },
      { status: 500 },
    );
  }
}
