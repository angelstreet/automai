/* eslint-disable */
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../logger';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { handleSshConnection } from './ssh';
import { WebSocketConnection } from '@/types/ssh';

// Define custom WebSocket interface with isAlive property
interface ExtendedWebSocket extends WebSocket {
  ws_isAlive?: boolean;
}

// Global variable to store the WebSocket server instance
// Using global scope ensures the instance persists across HMR (Hot Module Replacement)
declare global {
  var websocketServer: WebSocketServer | undefined;
  var websocketInitialized: boolean | undefined;
}

/**
 * Initialize the WebSocket server as a strict singleton
 * This should only be called once per server lifecycle
 */
export function initializeWebSocketServer(): WebSocketServer {
  // STRICT SINGLETON PATTERN: 
  // If we already have an instance or the initialization flag is set, return existing instance
  if (global.websocketServer) {
    logger.info('Using existing WebSocket server singleton instance');
    return global.websocketServer;
  }
  
  // Set initialization flag immediately to prevent concurrent initialization
  global.websocketInitialized = true;
  
  try {
    logger.info('Creating new WebSocket server singleton instance');
    
    // Create WebSocket server with noServer option (we'll handle upgrade events separately)
    const wss = new WebSocketServer({ noServer: true });
    
    // Store the instance immediately in global scope
    global.websocketServer = wss;
    
    // Set up ping interval to detect dead connections
    const pingInterval = setInterval(() => {
      if (!global.websocketServer) {
        logger.info('Clearing ping interval as WebSocket server no longer exists');
        clearInterval(pingInterval);
        return;
      }
      
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

    // Handle server close - important for cleanup
    wss.on('close', () => {
      logger.info('WebSocket server closed, clearing ping interval');
      clearInterval(pingInterval);
      // Don't reset the global instance - this can cause issues with HMR
      // Instead, we'll let the server recreate itself on next restart
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

    logger.info('WebSocket server singleton initialized successfully');
    return wss;
  } catch (error) {
    // Reset initialization flag on error so we can try again
    logger.error(`WebSocket server initialization failed: ${error}`);
    global.websocketInitialized = false;
    
    // Don't throw - return a dummy server to prevent crashes
    const dummyServer = new WebSocketServer({ noServer: true });
    global.websocketServer = dummyServer;
    return dummyServer;
  }
}

/**
 * Get the WebSocket server singleton instance, initializing it if necessary
 * This is the recommended method for accessing the WebSocket server
 */
export function getWebSocketServer(): WebSocketServer {
  // If we already have a server instance, return it immediately
  if (global.websocketServer) {
    return global.websocketServer;
  }
  
  // If another initialization is already in progress, wait for it
  if (global.websocketInitialized) {
    logger.info('WebSocket initialization in progress, creating temporary instance');
    // Return a dummy server that will be replaced by the real one
    const tempServer = new WebSocketServer({ noServer: true });
    return tempServer;
  }
  
  // Initialize the WebSocket server if needed
  logger.info('No WebSocket server found, initializing singleton');
  return initializeWebSocketServer();
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
        is_windows: data.is_windows,
      });

      console.log('DEBUG: WebSocket connectionId:', ws_connectionId);
      console.log(
        'DEBUG: Auth data:',
        JSON.stringify({
          connectionType: data.connectionType,
          ssh_username: data.username || data.ssh_username,
          ssh_hasPassword: !!(data.password || data.ssh_password),
          ssh_host: data.host || data.ssh_host,
          is_windows: data.is_windows,
        }),
      );

      // Handle SSH connection
      if (data.connectionType === 'ssh') {
        // Map incoming parameters to ssh_ prefixed parameters
        handleSshConnection(ws, ws_connectionId, {
          ssh_username: data.username || data.ssh_username,
          ssh_password: data.password || data.ssh_password,
          ssh_host: data.host || data.ssh_host,
          ssh_port: data.port || data.ssh_port,
          is_windows: data.is_windows,
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
 * Close the WebSocket server singleton and clean up resources
 * This should be called during server shutdown
 */
export function closeWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    // Check if we even have a WebSocket server to close
    if (!global.websocketServer) {
      logger.info('No WebSocket server instance to close');
      resolve();
      return;
    }

    logger.info('Closing WebSocket server singleton');
    
    // Shorter timeout for WebSocket server close - 500ms
    const closeTimeout = setTimeout(() => {
      logger.warn('WebSocket server close timed out, forcing close');
      
      try {
        // Attempt final forceful cleanup of all WebSocket clients
        if (global.websocketServer) {
          logger.info('Forcefully terminating all remaining WebSocket connections');
          global.websocketServer.clients.forEach((ws) => {
            try {
              ws.terminate();
            } catch (e) {
              // Ignore errors terminating individual clients
            }
          });
        }
      } catch (e) {
        logger.error(`Error during forced WebSocket cleanup: ${e}`);
      }
      
      // Reset singleton state
      logger.info('Resetting WebSocket singleton state');
      global.websocketServer = undefined;
      global.websocketInitialized = false;
      resolve();
    }, 500); // 500ms timeout - much shorter to prevent blocking HTTP server
    
    try {
      // First immediately terminate all client connections
      if (global.websocketServer && global.websocketServer.clients) {
        const clientCount = global.websocketServer.clients.size;
        logger.info(`Terminating ${clientCount} WebSocket connections`);
        
        global.websocketServer.clients.forEach((ws) => {
          try {
            // Send close frame with code 1001 (Going Away)
            ws.close(1001, 'Server Shutdown');
            // Also terminate immediately to ensure quick shutdown
            ws.terminate();
          } catch (e) {
            logger.error(`Error terminating WebSocket client: ${e}`);
          }
        });
      }
      
      // Then try to close the server gracefully
      if (global.websocketServer) {
        global.websocketServer.close(() => {
          clearTimeout(closeTimeout);
          logger.info('WebSocket server closed successfully');
          // Reset singleton state after successful close
          global.websocketServer = undefined;
          global.websocketInitialized = false;
          resolve();
        });
      } else {
        clearTimeout(closeTimeout);
        resolve();
      }
    } catch (e) {
      logger.error(`Error during WebSocket server close: ${e}`);
      clearTimeout(closeTimeout);
      // Always reset state even on error
      global.websocketServer = undefined;
      global.websocketInitialized = false;
      resolve();
    }
  });
}
