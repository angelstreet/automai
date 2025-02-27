import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { WebSocketConnection, handleUpgrade } from '@/lib/websocket-server';
import { IncomingMessage } from 'http';

export async function setupWebSocket(
  request: NextRequest,
  machineId: string
): Promise<{ clientSocket: WebSocketConnection; response: Response }> {
  console.log('[WebSocket] Setup started for machine:', machineId);
  console.log('[WebSocket] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));

  // This is a WebSocket endpoint
  if (!request.headers.get('upgrade')?.toLowerCase().includes('websocket')) {
    console.log('[WebSocket] No upgrade header found');
    throw new Error('Expected WebSocket connection');
  }
  
  // Get the raw request and socket
  const req = request as any;
  console.log('[WebSocket] Raw request properties:', Object.keys(req));
  
  const socket = req.socket;
  console.log('[WebSocket] Socket available:', !!socket);
  
  const head = Buffer.from('');
  
  if (!socket) {
    console.log('[WebSocket] Socket not found in request');
    throw new Error('Cannot access socket for WebSocket upgrade');
  }
  
  // Return a promise that resolves when the WebSocket connection is established
  return new Promise((resolve, reject) => {
    try {
      // Set up the upgrade handler for this specific path
      const path = `/api/virtualization/machines/${machineId}/terminal`;
      console.log('[WebSocket] Attempting upgrade on path:', path);
      
      // Handle the upgrade
      handleUpgrade(req, socket, head, path, (clientSocket) => {
        console.log('[WebSocket] Upgrade successful, socket connected');
        
        // Log the connection
        logger.info('Terminal WebSocket connection established', {
          action: 'TERMINAL_WS_CONNECTED',
          data: { machineId },
          saveToDb: true
        });
        
        // Set up ping/pong for connection health
        clientSocket.isAlive = true;
        clientSocket.on('pong', () => {
          clientSocket.isAlive = true;
        });
        
        // Resolve the promise with the client socket and a response
        resolve({
          clientSocket,
          response: new Response(null, { 
            status: 101, 
            statusText: 'Switching Protocols',
            headers: {
              'Upgrade': 'websocket',
              'Connection': 'Upgrade'
            }
          })
        });
      });
    } catch (error) {
      console.log('[WebSocket] Setup error:', error);
      logger.error(`WebSocket setup error: ${error instanceof Error ? error.message : String(error)}`, {
        action: 'WEBSOCKET_SETUP_ERROR',
        data: { machineId },
        saveToDb: true
      });
      reject(error);
    }
  });
}

export function setupAuthTimeout(
  clientSocket: WebSocketConnection,
  machineId: string
): NodeJS.Timeout {
  // Set up authentication timeout
  const authTimeout = setTimeout(() => {
    logger.error('Authentication timeout', {
      action: 'TERMINAL_AUTH_TIMEOUT',
      data: { machineId },
      saveToDb: true
    });
    clientSocket.send(JSON.stringify({ error: 'Authentication timeout. Please try again.' }));
    clientSocket.close();
  }, 10000); // 10 seconds timeout
  
  return authTimeout;
} 