import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { serverCache } from '@/lib/cache';
import { setupWebSocket, setupAuthTimeout } from './utils/websocket';
import { handleSshConnection, handleMockTerminal } from './utils/terminal-handlers';

// Export runtime configuration for Edge compatibility
export const runtime = 'nodejs';

// Export config to disable body parsing for WebSocket
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const params = await Promise.resolve(context.params);
    const { id } = params;
    
    if (!id) {
      return new Response('Machine ID is required', { status: 400 });
    }
    
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
      return new Response('Machine not found or unauthorized', { status: 404 });
    }
    
    // Update connection status to connected
    await prisma.connection.update({
      where: { id },
      data: {
        status: 'connected',
        lastConnected: new Date(),
        errorMessage: null
      }
    });
    
    // Invalidate cache for machines data
    const cacheKey = `machines_${userId}_${tenantId || 'personal'}`;
    await serverCache.delete(cacheKey);
    
    // Set up WebSocket connection
    const { clientSocket, response } = await setupWebSocket(request, id);
    
    // Set up authentication timeout
    setupAuthTimeout(clientSocket, id);
    
    // Check if this is an SSH connection
    if (connection.type === 'ssh') {
      // Handle SSH connection
      handleSshConnection(clientSocket, connection, id);
    } else {
      // For non-SSH connections, use the mock implementation
      handleMockTerminal(clientSocket, connection, id);
    }
    
    return response;
  } catch (error) {
    logger.error(`Error in terminal WebSocket: ${error instanceof Error ? error.message : String(error)}`, {
      action: 'TERMINAL_WS_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    return new Response('Internal Server Error', { status: 500 });
  }
} 