/* eslint-disable */
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../logger';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { handleSshConnection, WebSocketConnection } from './ssh';

// Define custom WebSocket interface with isAlive property
interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
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
      if (extClient.isAlive === false) {
        logger.info('Terminating inactive WebSocket connection');
        return client.terminate();
      }

      extClient.isAlive = false;
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
      ip: req.socket.remoteAddress,
    });

    const extWs = ws as ExtendedWebSocket;
    extWs.isAlive = true;

    ws.on('pong', () => {
      (ws as ExtendedWebSocket).isAlive = true;
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
export function handleUpgrade(
  request: IncomingMessage,
  socket: Socket,
  head: Buffer
) {
  const wss = getWebSocketServer();
  
  if (!wss) {
    logger.error('No WebSocket server instance available');
    socket.destroy();
    return;
  }

  logger.info('Handling WebSocket upgrade request');
  
  // Extract the connection ID from the request if available
  const connectionId = (request as any).connectionId;
  if (connectionId) {
    logger.info('WebSocket upgrade with connection ID:', { connectionId });
  }
  
  wss.handleUpgrade(request, socket, head, (ws) => {
    // Store the connection ID on the WebSocket object if available
    if (connectionId) {
      (ws as any).connectionId = connectionId;
    }
    
    // Set up message handler
    ws.on('message', (message) => {
      try {
        const messageStr = message.toString();
        logger.debug('Received WebSocket message', { 
          connectionId: (ws as any).connectionId,
          message: messageStr.substring(0, 100) // Log only first 100 chars
        });
        handleMessage(ws as WebSocketConnection, messageStr);
      } catch (error) {
        logger.error('Error handling WebSocket message', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
    
    wss.emit('connection', ws, request);
  });
}

/**
 * Handle messages from client
 */
export function handleMessage(ws: WebSocketConnection, message: string): void {
  try {
    const data = JSON.parse(message);

    // Handle authentication
    if (data.type === 'auth') {
      logger.info('Received auth request', {
        connectionId: (ws as any).connectionId,
        connectionType: data.connectionType,
        username: data.username,
      });

      // Handle SSH connection
      if (data.connectionType === 'ssh') {
        handleSshConnection(ws, (ws as any).connectionId, {
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
