import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Import the WebSocket server initialization function
    const { initializeWebSocketServer } = require('../../../../../websocket_server');
    
    // Initialize the WebSocket server
    initializeWebSocketServer();
    
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('[API] Failed to initialize WebSocket server:', error);
    return NextResponse.json(
      { error: 'Failed to initialize WebSocket server' },
      { status: 500 }
    );
  }
} 