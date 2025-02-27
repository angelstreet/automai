import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '@/lib/logger';
import { IncomingMessage } from 'http';
import { Server } from 'http';

// Global WebSocketServer instance (singleton pattern)
let wss: WebSocketServer | null = null;
let httpServer: Server | null = null;

// Define WebSocketConnection type
export interface WebSocketConnection extends WebSocket {
  isAlive?: boolean;
}

/**
 * Initialize the WebSocket server with an HTTP server
 * @param server The HTTP server instance
 */
export function initializeWebSocketServer(server: Server) {
  if (httpServer === server) {
    return; // Already initialized with this server
  }

  console.log('[WebSocketServer] Initializing with HTTP server');
  httpServer = server;

  if (!wss) {
    console.log('[WebSocketServer] Creating new WebSocket server');
    wss = new WebSocketServer({ noServer: true });

    // Set up ping interval
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

    wss.on('close', () => {
      clearInterval(pingInterval);
      wss = null;
      httpServer = null;
    });

    wss.on('connection', (ws: WebSocketConnection) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
    });
  }

  // Handle upgrade requests
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    console.log('[WebSocketServer] Received upgrade request:', request.url);
    
    if (!wss) {
      console.log('[WebSocketServer] No WebSocket server available');
      socket.destroy();
      return;
    }

    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const path = url.pathname;

    if (path.startsWith('/api/virtualization/machines/') && path.endsWith('/terminal')) {
      console.log('[WebSocketServer] Handling terminal WebSocket upgrade');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss?.emit('connection', ws, request);
      });
    } else {
      console.log('[WebSocketServer] Invalid WebSocket path:', path);
      socket.destroy();
    }
  });
}

// Export the getWebSocketServer function for compatibility
export function getWebSocketServer(): WebSocketServer {
  if (!wss) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocketServer first.');
  }
  return wss;
}

// Export the handleUpgrade function with the same signature
export function handleUpgrade(
  req: IncomingMessage,
  socket: any,
  head: Buffer,
  path: string,
  onConnection: (ws: WebSocketConnection, req: IncomingMessage) => void
): void {
  if (!wss) {
    console.log('[WebSocketServer] No WebSocket server available');
    socket.destroy();
    return;
  }

  console.log('[WebSocketServer] Handling upgrade for path:', path);
  
  wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    const wsConnection = ws as WebSocketConnection;
    wsConnection.isAlive = true;
    
    wsConnection.on('pong', () => {
      wsConnection.isAlive = true;
    });

    wss?.emit('connection', wsConnection, req);
    onConnection(wsConnection, req);
  });
} 