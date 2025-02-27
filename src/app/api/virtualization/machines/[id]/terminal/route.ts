import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { serverCache } from '@/lib/cache';
import { setupWebSocket, setupAuthTimeout } from './utils/websocket';
import { handleSshConnection, handleMockTerminal } from './utils/terminal-handlers';
import { initializeWebSocketServer } from '@/lib/websocket-server';

// Export runtime configuration for Edge compatibility
export const runtime = 'nodejs';

// Export config to disable body parsing for WebSocket
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Log request details for debugging
    logger.info(`WebSocket terminal request received for machine ${context.params.id}`, {
      action: 'TERMINAL_WS_REQUEST',
      data: {
        url: request.url,
        method: request.method,
        id: context.params.id,
        headers: Object.fromEntries(request.headers.entries())
      },
      saveToDb: true
    });
    
    console.log('[WebSocket Route] Received request:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });

    // With our custom server, the WebSocket server is already initialized
    // This code is kept for backward compatibility but won't do anything in the custom server setup
    const server = (request as any).socket?.server;
    if (server && !server._webSocketInitialized) {
      console.log('[WebSocket Route] Initializing WebSocket server');
      initializeWebSocketServer(server);
      server._webSocketInitialized = true;
    }

    // Check for WebSocket upgrade request
    if (!request.headers.get('upgrade')?.toLowerCase().includes('websocket')) {
      console.log('[WebSocket Route] No upgrade header found');
      return new Response('Expected WebSocket connection', { status: 426 });
    }
    console.log('[WebSocket Route] WebSocket upgrade request detected');

    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.log('[WebSocket Route] No session or user found');
      return new Response('Unauthorized', { status: 401 });
    }
    console.log('[WebSocket Route] User authenticated:', session.user.id);
    
    const params = await Promise.resolve(context.params);
    const { id } = params;
    
    if (!id) {
      console.log('[WebSocket Route] No machine ID provided');
      return new Response('Machine ID is required', { status: 400 });
    }
    console.log('[WebSocket Route] Machine ID:', id);
    
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    
    // Verify the user has access to this machine
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { tenantId: tenantId || undefined }
        ]
      }
    });
    
    if (!connection) {
      console.log('[WebSocket Route] Machine not found or unauthorized');
      return new Response('Machine not found or unauthorized', { status: 404 });
    }
    console.log('[WebSocket Route] Found connection:', { id: connection.id, type: connection.type });
    
    // Update connection status to connected
    await prisma.connection.update({
      where: { id },
      data: {
        status: 'connected',
        lastConnected: new Date(),
        errorMessage: null
      }
    });
    console.log('[WebSocket Route] Updated connection status to connected');
    
    // Invalidate cache for machines data
    const cacheKey = `machines_${userId}_${tenantId || 'personal'}`;
    await serverCache.delete(cacheKey);
    
    // Set up WebSocket connection
    console.log('[WebSocket Route] Setting up WebSocket connection');
    const { clientSocket, response } = await setupWebSocket(request, id);
    console.log('[WebSocket Route] WebSocket connection established');
    
    // Set up authentication timeout
    console.log('[WebSocket Route] Setting up authentication timeout');
    setupAuthTimeout(clientSocket, id);
    
    // Check if this is an SSH connection
    if (connection.type === 'ssh') {
      console.log('[WebSocket Route] Handling SSH connection');
      handleSshConnection(clientSocket, connection, id);
    } else {
      console.log('[WebSocket Route] Handling mock terminal connection');
      handleMockTerminal(clientSocket, connection, id);
    }
    
    console.log('[WebSocket Route] Returning response with status:', response.status);
    return response;
  } catch (error) {
    console.error('[WebSocket Route] Error:', error);
    logger.error(`Error in terminal WebSocket: ${error instanceof Error ? error.message : String(error)}`, {
      action: 'TERMINAL_WS_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    return new Response('Internal Server Error', { status: 500 });
  }
} 