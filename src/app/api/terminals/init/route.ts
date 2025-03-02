import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getWebSocketServer } from '@/lib/services/websocket';
import { logger } from '@/lib/logger';
import { getCompatibleConnection } from '@/lib/services/terminal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('Terminal init API called');
  try {
    console.log('Authentication bypassed for debugging');

    const wss = getWebSocketServer();
    console.log('WebSocket server initialized:', !!wss);

    if (!wss) {
      console.error('Failed to initialize WebSocket server');
      return NextResponse.json(
        { success: false, error: 'Failed to initialize WebSocket server' },
        { status: 500 }
      );
    }

    console.log('WebSocket server ready for connections');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error initializing terminal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize terminal' },
      { status: 500 }
    );
  }
}
