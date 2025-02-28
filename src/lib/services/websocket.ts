/* eslint-disable */
import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { logger } from '../logger';
import { handleSshConnection, WebSocketConnection } from './ssh';

// Define global type for WebSocketServer singleton
declare global {
  var websocketServer: WSServer | undefined;
}

// WebSocketServer instance cache
let wss: WSServer | null = global.websocketServer || null;
let pingInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the WebSocket server with an HTTP server
 */
export function initializeWebSocketServer(server: Server): WSServer {
  logger.info('Initializing WebSocket server');

  // Create new WebSocketServer if none exists
  if (!wss) {
    logger.info('Creating new WebSocketServer instance');
    wss = new WSServer({ noServer: true });

    // Set up ping interval to detect dead connections
    pingInterval = setInterval(() => {
      if (wss) {
        wss.clients.forEach((ws: WebSocketConnection) => {
          if (ws.isAlive === false) return ws.terminate();
          ws.isAlive = false;
          ws.ping();
        });
      }
    }, 30000);

    // Handle server close
    wss.on('close', () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
    });

    // Set up connection handler
    wss.on('connection', (ws: WebSocketConnection, request: IncomingMessage) => {
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      logger.info('WebSocket client connected');

      // Extract connection ID from URL
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const pathname = url.pathname;
      const connectionIdMatch = pathname.match(/\/terminals\/([^\/]+)/);
      const connectionId = connectionIdMatch ? connectionIdMatch[1] : null;

      if (!connectionId) {
        logger.error('No connection ID found in URL', { pathname });
        ws.send(
          JSON.stringify({
            error: 'Invalid connection ID',
            errorType: 'INVALID_CONNECTION_ID',
          }),
        );
        return;
      }

      logger.info('Connection ID extracted', { connectionId });

      // Set up authentication timeout (5 seconds)
      const authTimeout = setTimeout(() => {
        logger.error('Authentication timeout', { connectionId });
        ws.send(
          JSON.stringify({
            error: 'Authentication timeout',
            errorType: 'AUTH_TIMEOUT',
          }),
        );
        ws.terminate();
      }, 5000);

      // Store the timeout in the socket for later cleanup
      ws.authTimeout = authTimeout;

      // Handle messages from client
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());

          // Handle authentication
          if (data.type === 'auth') {
            logger.info('Received auth request', {
              connectionId,
              connectionType: data.connectionType,
              username: data.username,
            });

            // Handle SSH connection
            if (data.connectionType === 'ssh') {
              await handleSshConnection(ws, connectionId, {
                username: data.username,
                password: data.password,
              });
            } else {
              logger.error('Unsupported connection type', { type: data.connectionType });
              ws.send(
                JSON.stringify({
                  error: `Unsupported connection type: ${data.connectionType}`,
                  errorType: 'UNSUPPORTED_CONNECTION_TYPE',
                }),
              );
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Error processing message', { error: errorMessage });
          ws.send(
            JSON.stringify({
              error: 'Invalid message format: ' + errorMessage,
              errorType: 'INVALID_MESSAGE',
            }),
          );
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        // Clear any pending timeouts
        if (ws.authTimeout) {
          clearTimeout(ws.authTimeout);
          delete ws.authTimeout;
        }
        logger.info('WebSocket client disconnected');
      });
    });

    // Store in global for singleton pattern
    if (process.env.NODE_ENV !== 'production') {
      global.websocketServer = wss;
    }
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
  logger.info('Handling WebSocket upgrade', { path });

  // Get or create WebSocketServer
  const websocketServer = wss || initializeWebSocketServer(socket.server);

  if (websocketServer) {
    websocketServer.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      websocketServer.emit('connection', ws, request);
    });
  } else {
    logger.error('No WebSocketServer instance available');
    socket.destroy();
  }
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WSServer | null {
  if (!wss) {
    logger.warn('WebSocketServer not initialized yet');
  }
  return wss;
}

/**
 * Close the WebSocket server and clean up resources
 */
export function closeWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!wss) {
      resolve();
      return;
    }

    logger.info('Closing WebSocket server');

    // Clear ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    // Close all connections with a timeout
    const closeTimeout = setTimeout(() => {
      logger.warn('WebSocket server close timed out, forcing close');
      wss = null;
      global.websocketServer = undefined;
      resolve();
    }, 2000); // 2 second timeout

    // Close all connections
    wss.clients.forEach((ws) => {
      ws.terminate();
    });

    // Close the server
    wss.close(() => {
      clearTimeout(closeTimeout);
      logger.info('WebSocket server closed');
      wss = null;
      global.websocketServer = undefined;
      resolve();
    });
  });
}
