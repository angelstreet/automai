import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { logger } from './logger';
import { IncomingMessage } from 'http';
import { Server } from 'http';

// Extend global to include our WebSocketServer
declare global {
  let wss: WSServer | null;
}

// Define WebSocketConnection type
export type WebSocketConnection = WebSocket & {
  isAlive?: boolean;
};

// Local WebSocketServer instance
let wss: WSServer | null = null;
let httpServer: Server | null = null;

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

  // Check if we already have a global WebSocketServer from the custom server
  if (global.wss) {
    console.log('[WebSocketServer] Using global WebSocketServer instance');
    return;
  }

  // If no global instance, create a new one
  if (!wss) {
    console.log('[WebSocketServer] Creating new WebSocketServer instance');
    wss = new WSServer({ noServer: true });

    // Set up ping interval to detect dead connections
    const pingInterval = setInterval(() => {
      if (wss) {
        wss.clients.forEach((ws: WebSocketConnection) => {
          if (ws.isAlive === false) return ws.terminate();
          ws.isAlive = false;
          ws.ping();
        });
      }
    }, 30000);

    wss.on('close', () => clearInterval(pingInterval));

    wss.on('connection', (ws: WebSocketConnection) => {
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      logger.info('WebSocket client connected');
    });
  }
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WSServer {
  // Check if we have a global WebSocketServer from the custom server
  if (global.wss) {
    return global.wss;
  }

  // If no global instance, use or create the local one
  if (!wss) {
    console.log('[WebSocketServer] Creating WebSocketServer instance on demand');
    wss = new WSServer({ noServer: true });

    // Set up ping interval to detect dead connections
    const pingInterval = setInterval(() => {
      if (wss) {
        wss.clients.forEach((ws: WebSocketConnection) => {
          if (ws.isAlive === false) return ws.terminate();
          ws.isAlive = false;
          ws.ping();
        });
      }
    }, 30000);

    wss.on('close', () => clearInterval(pingInterval));

    wss.on('connection', (ws: WebSocketConnection) => {
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      logger.info('WebSocket client connected');
    });
  }

  return wss;
}

/**
 * Handle WebSocket upgrade request
 */
export function handleUpgrade(
  request: IncomingMessage,
  socket: any,
  head: Buffer,
  path: string,
): void {
  console.log(`[WebSocketServer] Handling upgrade for path: ${path}`);

  // Get WebSocketServer instance (from global or local)
  const websocketServer = global.wss || getWebSocketServer();

  if (websocketServer) {
    websocketServer.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      websocketServer.emit('connection', ws, request);
    });
  } else {
    console.error('[WebSocketServer] No WebSocketServer instance available');
    socket.destroy();
  }
}

// Handle upgrade requests - this is now handled by the custom server
// We'll keep this code for backward compatibility but it won't be used
export function handleUpgradeLegacy(
  req: IncomingMessage,
  socket: any,
  head: Buffer,
  path: string,
  onConnection: (ws: WebSocketConnection, req: IncomingMessage) => void,
): void {
  // Try to get the WebSocket server from global if not initialized here
  if (!wss) {
    const globalWss = (global as any).wss;
    if (globalWss) {
      wss = globalWss as WSServer;
    } else {
      console.log('[WebSocketServer] No WebSocket server available');
      socket.destroy();
      return;
    }
  }

  console.log('[WebSocketServer] Handling upgrade for path:', path);

  // At this point, wss should be non-null, but TypeScript doesn't know that
  // We'll use a local variable that's guaranteed to be non-null
  const websocketServer = wss as WSServer;

  websocketServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    const wsConnection = ws as WebSocketConnection;
    wsConnection.isAlive = true;

    wsConnection.on('pong', () => {
      wsConnection.isAlive = true;
    });

    websocketServer.emit('connection', wsConnection, req);
    onConnection(wsConnection, req);
  });
}

export class WebSocketServer {
  private wss: WSServer;
  private readonly port: number;
  private readonly host: string;

  constructor(port = 8080, host = 'localhost') {
    this.port = port;
    this.host = host;
    this.wss = new WSServer({ port, host });
    this.setupHeartbeat();
    this.setupEventHandlers();
    logger.info(`WebSocket server started on ws://${host}:${port}`);
  }

  private setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const wsWithHeartbeat = ws as WebSocket & { isAlive?: boolean };
        if (wsWithHeartbeat.isAlive === false) {
          return ws.terminate();
        }
        wsWithHeartbeat.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws) => {
      const wsWithHeartbeat = ws as WebSocket & { isAlive?: boolean };
      wsWithHeartbeat.isAlive = true;

      ws.on('pong', () => {
        wsWithHeartbeat.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });

      ws.on('close', () => {
        logger.info('Client disconnected');
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any) {
    // Add your message handling logic here
    logger.info('Received message:', message);
  }

  public broadcast(message: any) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public close() {
    this.wss.close();
  }
}
