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
    // Completely bypass authentication for debugging
    console.log('Authentication bypassed for debugging');

    const body = await request.json();
    console.log('Request body:', body);
    
    const { connectionId } = body;
    
    if (!connectionId) {
      console.log('No connectionId provided');
      return NextResponse.json(
        { success: false, error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    console.log(`Initializing WebSocket for connection: ${connectionId}`);
    
    // Use the compatibility function to get the connection with proper fields
    const connection = await getCompatibleConnection(connectionId);
    
    if (!connection) {
      console.log(`Connection not found: ${connectionId}`);
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Initialize the WebSocket server
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
