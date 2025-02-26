import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '@/lib/logger';
import { IncomingMessage } from 'http';

// Global WebSocketServer instance (singleton pattern)
let wss: WebSocketServer | null = null;

// Define WebSocketConnection type
export interface WebSocketConnection extends WebSocket {
  isAlive?: boolean;
}

/**
 * Get or initialize the global WebSocketServer instance
 * @returns The WebSocketServer instance
 */
export function getWebSocketServer(): WebSocketServer {
  if (!wss) {
    logger.info('Initializing WebSocketServer', {
      action: 'WEBSOCKET_SERVER_INIT',
      saveToDb: true
    });
    
    wss = new WebSocketServer({ noServer: true });
    
    // Set up ping interval to detect dead connections
    const pingInterval = setInterval(() => {
      if (!wss) {
        clearInterval(pingInterval);
        return;
      }
      
      wss.clients.forEach((ws: WebSocketConnection) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    
    // Handle server close
    wss.on('close', () => {
      clearInterval(pingInterval);
      wss = null;
    });
  }
  
  return wss;
}

/**
 * Handle WebSocket upgrade for a specific path
 * @param req The HTTP request
 * @param socket The network socket
 * @param head The first packet of the upgraded stream
 * @param path The path to match for upgrade
 * @param onConnection Callback when connection is established
 */
export function handleUpgrade(
  req: IncomingMessage,
  socket: any,
  head: Buffer,
  path: string,
  onConnection: (ws: WebSocketConnection, req: IncomingMessage) => void
): void {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  
  if (url.pathname === path) {
    const server = getWebSocketServer();
    
    server.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      const wsConnection = ws as WebSocketConnection;
      wsConnection.isAlive = true;
      
      // Set up pong handler
      wsConnection.on('pong', () => {
        wsConnection.isAlive = true;
      });
      
      server.emit('connection', wsConnection, req);
      onConnection(wsConnection, req);
    });
  } else {
    // Not a WebSocket upgrade for our path
    socket.destroy();
  }
} 