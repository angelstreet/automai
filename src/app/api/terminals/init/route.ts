import { NextRequest, NextResponse } from 'next/server';

import { getWebSocketServer } from '@/lib/services/websocketService';

export const dynamic = 'force-dynamic';
export const _runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('Terminal init API called');
  try {
    console.log('Authentication bypassed for debugging');

    // Prevent server restarts by handling WebSocket initialization carefully
    try {
      const wss = getWebSocketServer();
      console.log('WebSocket server initialized:', !!wss);

      if (!wss) {
        console.error('Failed to initialize WebSocket server');
        return NextResponse.json(
          { success: false, error: 'Failed to initialize WebSocket server' },
          { status: 500 },
        );
      }
    } catch (wsError) {
      console.error('WebSocket server initialization error (gracefully continuing):', wsError);
      // Don't fail the whole request due to WebSocket issues
    }

    console.log('WebSocket server ready for connections');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error initializing terminal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize terminal' },
      { status: 500 },
    );
  }
}
