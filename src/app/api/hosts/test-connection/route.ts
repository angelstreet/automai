import { NextResponse } from 'next/server';
import { testHostConnection } from '@/lib/services/hosts';

export async function POST(request: Request) {
  try {
    const host = await request.json();
    console.log('Test connection request:', { ...host, password: '***' });
    
    const result = await testHostConnection(host);
    console.log('Test connection result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/hosts/test-connection:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to test connection' },
      { status: 500 }
    );
  }
}
