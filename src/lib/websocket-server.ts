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
    console.log('[WebSocketServer] Initializing new WebSocket server');
    logger.info('Initializing WebSocketServer', {
      action: 'WEBSOCKET_SERVER_INIT',
      saveToDb: true
    });
    
    wss = new WebSocketServer({ noServer: true });
    console.log('[WebSocketServer] Created with noServer: true');
    
    // Set up ping interval to detect dead connections
    const pingInterval = setInterval(() => {
      if (!wss) {
        console.log('[WebSocketServer] Server gone, clearing ping interval');
        clearInterval(pingInterval);
        return;
      }
      
      console.log('[WebSocketServer] Checking client connections:', wss.clients.size);
      wss.clients.forEach((ws: WebSocketConnection) => {
        if (ws.isAlive === false) {
          console.log('[WebSocketServer] Terminating dead connection');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    
    // Handle server close
    wss.on('close', () => {
      console.log('[WebSocketServer] Server closed');
      clearInterval(pingInterval);
      wss = null;
    });

    // Handle server errors
    wss.on('error', (error) => {
      console.error('[WebSocketServer] Server error:', error);
    });

    // Handle new connections
    wss.on('connection', (ws: WebSocketConnection) => {
      console.log('[WebSocketServer] New client connected');
      ws.isAlive = true;
      
      ws.on('pong', () => {
        console.log('[WebSocketServer] Received pong from client');
        ws.isAlive = true;
      });
      
      ws.on('error', (error) => {
        console.error('[WebSocketServer] Client connection error:', error);
      });
      
      ws.on('close', () => {
        console.log('[WebSocketServer] Client disconnected');
      });
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
  console.log('[WebSocketServer] Handling upgrade request for path:', path);
  console.log('[WebSocketServer] Request URL:', req.url);
  console.log('[WebSocketServer] Request headers:', req.headers);
  
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  console.log('[WebSocketServer] Parsed URL pathname:', url.pathname);
  
  if (url.pathname === path) {
    console.log('[WebSocketServer] Path matches, getting server instance');
    const server = getWebSocketServer();
    
    console.log('[WebSocketServer] Upgrading connection');
    server.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      console.log('[WebSocketServer] Connection upgraded successfully');
      const wsConnection = ws as WebSocketConnection;
      wsConnection.isAlive = true;
      
      // Set up pong handler
      wsConnection.on('pong', () => {
        console.log('[WebSocketServer] Received pong from client');
        wsConnection.isAlive = true;
      });

      wsConnection.on('error', (error) => {
        console.error('[WebSocketServer] Client connection error:', error);
      });

      wsConnection.on('close', () => {
        console.log('[WebSocketServer] Client disconnected');
      });
      
      console.log('[WebSocketServer] Emitting connection event');
      server.emit('connection', wsConnection, req);
      onConnection(wsConnection, req);
    });
  } else {
    console.log('[WebSocketServer] Path mismatch, destroying socket');
    socket.destroy();
  }
} 