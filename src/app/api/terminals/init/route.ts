import { NextRequest, NextResponse } from 'next/server';

import { getWebSocketServer } from '@/lib/services/websocket';

export const dynamic = 'force-dynamic';
export const _runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  console.log('Terminal init API called');
  try {
    console.log('Authentication bypassed for debugging');

    const wss = getWebSocketServer();
    console.log('WebSocket server initialized:', !!wss);

    if (!wss) {
      console.error('Failed to initialize WebSocket server');
      return NextResponse.json(
        { success: false, error: 'Failed to initialize WebSocket server' },
        { status: 500 },
      );
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
