import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketServer, initializeWebSocketServer } from '@/lib/services/websocket';
import { logger } from '@/lib/logger';
import { getTerminalConnection } from '@/lib/services/terminal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    logger.info('Terminal initialization API called');
    
    // Parse request body
    const body = await request.json();
    const { connectionId } = body;

    logger.info('Initializing WebSocket server for connection', { connectionId });

    // Verify the connection exists
    try {
      if (connectionId) {
        const connection = await getTerminalConnection(connectionId);
        logger.info('Connection verified', { 
          connectionId, 
          host: connection.ip,
          type: connection.type 
        });
      }
    } catch (error) {
      // We'll continue even if connection verification fails
      // The actual SSH connection will be handled when the WebSocket connects
      logger.warn('Connection verification failed, but continuing', { 
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Initialize WebSocket server (this is a no-op if already initialized due to singleton pattern)
    const wss = initializeWebSocketServer();
    
    if (!wss) {
      logger.error('Failed to initialize WebSocket server');
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
