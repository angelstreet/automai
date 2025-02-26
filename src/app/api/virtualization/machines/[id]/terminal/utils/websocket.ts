import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { WebSocketConnection } from './terminal-handlers';

export async function setupWebSocket(
  request: NextRequest,
  machineId: string
): Promise<{ clientSocket: WebSocketConnection; response: Response }> {
  // This is a WebSocket endpoint
  if (!request.headers.get('upgrade')?.includes('websocket')) {
    throw new Error('Expected WebSocket connection');
  }
  
  // Create a WebSocket connection
  const { socket, response } = await new Promise<any>((resolve) => {
    const { socket, response } = Reflect.get(
      Object.getPrototypeOf(request),
      'socket'
    )(request);
    
    resolve({ socket, response });
  });
  
  // Log the connection
  logger.info('Terminal WebSocket connection established', {
    action: 'TERMINAL_WS_CONNECTED',
    data: { machineId },
    saveToDb: true
  });
  
  return { clientSocket: socket, response };
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