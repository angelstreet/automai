import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { WebSocketConnection, handleUpgrade } from '@/lib/websocket-server';
import { IncomingMessage } from 'http';

export async function setupWebSocket(
  request: NextRequest,
  machineId: string
): Promise<{ clientSocket: WebSocketConnection; response: Response }> {
  // This is a WebSocket endpoint
  if (!request.headers.get('upgrade')?.includes('websocket')) {
    throw new Error('Expected WebSocket connection');
  }
  
  // Access the raw request object
  const req = request as unknown as { raw: IncomingMessage };
  
  if (!req.raw) {
    throw new Error('Cannot access raw request for WebSocket upgrade');
  }
  
  // Return a promise that resolves when the WebSocket connection is established
  return new Promise((resolve, reject) => {
    try {
      // Set up the upgrade handler for this specific path
      const path = `/api/virtualization/machines/${machineId}/terminal`;
      
      // Get the socket and head from the request
      const socket = (request as any).socket;
      const head = Buffer.from('');
      
      // Handle the upgrade
      handleUpgrade(req.raw, socket, head, path, (clientSocket) => {
        // Log the connection
        logger.info('Terminal WebSocket connection established', {
          action: 'TERMINAL_WS_CONNECTED',
          data: { machineId },
          saveToDb: true
        });
        
        // Resolve the promise with the client socket and a response
        resolve({
          clientSocket,
          response: new Response(null, { status: 101, statusText: 'Switching Protocols' })
        });
      });
    } catch (error) {
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