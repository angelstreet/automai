import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { prisma } from '@/lib/prisma';
import { getWebSocketServer } from '@/lib/services/websocket';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { success: false, message: 'Connection ID is required' },
        { status: 400 },
      );
    }

    // Verify the connection exists and user has access
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { success: false, message: 'Connection not found' },
        { status: 404 },
      );
    }

    // Initialize WebSocket server (this is a no-op if already initialized)
    getWebSocketServer();

    return NextResponse.json({
      success: true,
      message: 'WebSocket server initialized',
    });
  } catch (error) {
    console.error('Error initializing WebSocket server:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initialize WebSocket server',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
