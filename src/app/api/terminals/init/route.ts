import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketServer } from '@/lib/services/websocket';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    logger.info('Terminal initialization API called');
    
    // Parse request body
    const body = await request.json();
    const { connectionId } = body;

    logger.info('Initializing WebSocket server for connection', { connectionId });

    // Initialize WebSocket server (this is a no-op if already initialized due to singleton pattern)
    const wss = getWebSocketServer();
    
    if (!wss) {
      logger.error('Failed to get WebSocket server instance');
      return NextResponse.json(
        { success: false, message: 'Failed to initialize WebSocket server' },
        { status: 500 },
      );
    }
    
    logger.info('WebSocket server initialized successfully');

    return NextResponse.json({
      success: true,
      message: 'WebSocket server initialized',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error initializing WebSocket server', { error: errorMessage });
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initialize WebSocket server',
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
