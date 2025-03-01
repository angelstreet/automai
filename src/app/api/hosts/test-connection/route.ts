import { NextResponse } from 'next/server';
import { testHostConnection } from '@/lib/services/hosts';

export async function POST(request: Request) {
  try {
    const host = await request.json();
    const result = await testHostConnection(host);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/hosts/test-connection:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to test connection' },
      { status: 500 }
    );
  }
}
