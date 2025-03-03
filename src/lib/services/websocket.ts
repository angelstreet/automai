/* eslint-disable */
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../logger';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { handleSshConnection, WebSocketConnection } from './ssh';

// Define custom WebSocket interface with isAlive property
interface ExtendedWebSocket extends WebSocket {
  ws_isAlive?: boolean;
}

// Global variable to store the WebSocket server instance
declare global {
  var websocketServer: WebSocketServer | undefined;
}

/**
 * Initialize the WebSocket server as a singleton
 */
export function initializeWebSocketServer(): WebSocketServer {
  console.log('Initializing WebSocket server (singleton)');

  // Check if we already have an instance
  if (global.websocketServer) {
    console.log('Using existing WebSocket server instance');
    return global.websocketServer;
  }

  // Create a new WebSocket server
  console.log('Creating new WebSocket server instance');
  const wss = new WebSocketServer({ noServer: true });

  // Set up ping interval to detect dead connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      const extClient = client as ExtendedWebSocket;
      if (extClient.ws_isAlive === false) {
        logger.info('Terminating inactive WebSocket connection');
        return client.terminate();
      }

      extClient.ws_isAlive = false;
      client.ping();
    });
  }, 30000);

  // Handle server close
  wss.on('close', () => {
    logger.info('WebSocket server closed, clearing ping interval');
    clearInterval(pingInterval);
    global.websocketServer = undefined;
  });

  // Log client connections
  wss.on('connection', (ws, req) => {
    logger.info('Client connected to WebSocket server', {
      ws_ip: req.socket.remoteAddress,
    });

    const extWs = ws as ExtendedWebSocket;
    extWs.ws_isAlive = true;

    ws.on('pong', () => {
      (ws as ExtendedWebSocket).ws_isAlive = true;
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error: error.message });
    });

    ws.on('close', () => {
      logger.info('Client disconnected from WebSocket server');
    });
  });

  // Store the instance in the global variable (in development/test)
  if (process.env.NODE_ENV !== 'production') {
    global.websocketServer = wss;
  }

  logger.info('WebSocket server initialized');
  return wss;
}

/**
 * Get the WebSocket server instance, initializing it if necessary
 */
export function getWebSocketServer(): WebSocketServer {
  if (!global.websocketServer) {
    return initializeWebSocketServer();
  }
  return global.websocketServer;
}

/**
 * Handle WebSocket upgrade request
 */
export function handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
  // Check if the socket has already been handled
  if ((socket as any).__websocketHandled) {
    logger.info('Skipping already handled socket');
    return;
  }

  console.log('handleUpgrade called with request headers:', request.headers);
  console.log('handleUpgrade request URL:', request.url);

  const wss = getWebSocketServer();

  if (!wss) {
    logger.error('No WebSocket server instance available');
    socket.destroy();
    return;
  }

  logger.info('Handling WebSocket upgrade request');

  // Extract the connection ID from the request if available
  let ws_connectionId = (request as any).connectionId;

  // Try to extract from URL as fallback
  if (!ws_connectionId && request.url) {
    try {
      const urlPath = request.url || '';
      const pathParts = urlPath.split('/');
      const potentialId = pathParts[pathParts.length - 1].split('?')[0]; // Remove query params if any
      if (potentialId && potentialId.length > 0) {
        console.log('Extracted ID from URL:', potentialId);
        ws_connectionId = potentialId;
        (request as any).connectionId = potentialId;
      }
    } catch (e) {
      console.error('Failed to extract ID from URL', e);
    }
  }

  if (ws_connectionId) {
    logger.info('WebSocket upgrade with connection ID:', { ws_connectionId });
    console.log('Connection ID for WebSocket:', ws_connectionId);
  } else {
    logger.warn('WebSocket upgrade request missing connectionId');
    console.log('No connectionId found on WebSocket upgrade request');
  }

  try {
    // Mark socket as handled to prevent duplicate handling
    (socket as any).__websocketHandled = true;

    wss.handleUpgrade(request, socket, head, (ws) => {
      // Store the connection ID on the WebSocket object if available
      if (ws_connectionId) {
        (ws as any).connectionId = ws_connectionId;
        console.log('Set connectionId on WebSocket object:', ws_connectionId);
      } else {
        console.warn('Cannot set connectionId on WebSocket: undefined');
      }

      // Set up message handler
      ws.on('message', (message) => {
        try {
          const messageStr = message.toString();
          logger.debug('Received WebSocket message', {
            ws_connectionId: (ws as any).connectionId,
            ws_message: messageStr.substring(0, 100), // Log only first 100 chars
          });
          handleMessage(ws as WebSocketConnection, messageStr);
        } catch (error) {
          logger.error('Error handling WebSocket message', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      wss.emit('connection', ws, request);
    });
  } catch (error) {
    logger.error('Error in WebSocket upgrade', {
      error: error instanceof Error ? error.message : String(error),
      ws_connectionId,
    });

    // Only destroy socket if it hasn't been handled
    if (!(socket as any).__websocketHandled) {
      socket.destroy();
    }
  }
}

/**
 * Handle messages from client
 */
export function handleMessage(ws: WebSocketConnection, message: string): void {
  try {
    const data = JSON.parse(message);
    const ws_connectionId = (ws as any).connectionId;

    console.log('handleMessage received data:', {
      type: data.type,
      ws_connectionId: ws_connectionId,
      ws_messageType: typeof message,
    });

    // Handle authentication
    if (data.type === 'auth') {
      logger.info('Received auth request', {
        ws_connectionId: ws_connectionId,
        connectionType: data.connectionType,
        ssh_username: data.username || data.ssh_username,
      });

      console.log('DEBUG: WebSocket connectionId:', ws_connectionId);
      console.log(
        'DEBUG: Auth data:',
        JSON.stringify({
          connectionType: data.connectionType,
          ssh_username: data.username || data.ssh_username,
          ssh_hasPassword: !!(data.password || data.ssh_password),
          sshhost: data.host || data.sshhost,
        }),
      );

      // Handle SSH connection
      if (data.connectionType === 'ssh') {
        // Map incoming parameters to ssh_ prefixed parameters
        handleSshConnection(ws, ws_connectionId, {
          ssh_username: data.username || data.ssh_username,
          ssh_password: data.password || data.ssh_password,
          sshhost: data.host || data.sshhost,
          ssh_port: data.port || data.ssh_port,
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
}

/**
 * Close the WebSocket server and clean up resources
 */
export function closeWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!global.websocketServer) {
      resolve();
      return;
    }

    logger.info('Closing WebSocket server');

    // Close all connections with a timeout
    const closeTimeout = setTimeout(() => {
      logger.warn('WebSocket server close timed out, forcing close');
      global.websocketServer = undefined;
      resolve();
    }, 2000); // 2 second timeout

    // Close all connections
    global.websocketServer.clients.forEach((ws) => {
      ws.terminate();
    });

    // Close the server
    global.websocketServer.close(() => {
      clearTimeout(closeTimeout);
      logger.info('WebSocket server closed');
      global.websocketServer = undefined;
      resolve();
    });
  });
}
