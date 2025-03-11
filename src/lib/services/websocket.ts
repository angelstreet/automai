/* eslint-disable */
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../logger';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { handleSshConnection } from './ssh';
import { WebSocketConnection } from '@/types/ssh';

interface ExtendedWebSocket extends WebSocket {
  ws_isAlive?: boolean;
}

declare global {
  var websocketServer: WebSocketServer | undefined;
  var websocketInitialized: boolean | undefined;
}

export function initializeWebSocketServer(): WebSocketServer {
  if (global.websocketServer) {
    logger.info('Using existing WebSocket server singleton instance');
    return global.websocketServer;
  }

  global.websocketInitialized = true;

  try {
    logger.info('Creating new WebSocket server singleton instance');
    const wss = new WebSocketServer({ noServer: true });
    global.websocketServer = wss;

    const pingInterval = setInterval(() => {
      if (!global.websocketServer) {
        logger.info('Clearing ping interval as WebSocket server no longer exists');
        clearInterval(pingInterval);
        return;
      }
      logger.debug('Running WebSocket ping check');
      wss.clients.forEach((client) => {
        const extClient = client as ExtendedWebSocket;
        if (extClient.ws_isAlive === false) {
          logger.info('Terminating inactive WebSocket connection', {
            ws_connectionId: (client as any).connectionId,
          });
          return client.terminate();
        }
        extClient.ws_isAlive = false;
        client.ping();
      });
    }, 30000);

    wss.on('close', () => {
      logger.info('WebSocket server closed, clearing ping interval');
      clearInterval(pingInterval);
    });

    wss.on('connection', (ws, req) => {
      logger.info('Client connected to WebSocket server', { ws_ip: req.socket.remoteAddress });
      (ws as ExtendedWebSocket).ws_isAlive = true; // Set initial alive state

      ws.on('pong', () => {
        logger.debug('Received pong from client', { ws_connectionId: (ws as any).connectionId });
        (ws as ExtendedWebSocket).ws_isAlive = true;
      });

      ws.on('close', (code, reason) => {
        logger.info('Client disconnected from WebSocket server', {
          ws_connectionId: (ws as any).connectionId,
          code,
          reason: reason.toString(),
          timestamp: new Date().toISOString(),
        });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', {
          ws_connectionId: (ws as any).connectionId,
          error: error.message,
        });
      });

      // Send immediate confirmation
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket established' }));
      logger.debug('Sent connection confirmation to client', {
        ws_connectionId: (ws as any).connectionId,
      });
    });

    logger.info('WebSocket server singleton initialized successfully');
    return wss;
  } catch (error) {
    logger.error(`WebSocket server initialization failed: ${error}`);
    global.websocketInitialized = false;
    const dummyServer = new WebSocketServer({ noServer: true });
    global.websocketServer = dummyServer;
    return dummyServer;
  }
}

export function getWebSocketServer(): WebSocketServer {
  if (global.websocketServer) {
    return global.websocketServer;
  }
  if (global.websocketInitialized) {
    logger.info('WebSocket initialization in progress, creating temporary instance');
    const tempServer = new WebSocketServer({ noServer: true });
    return tempServer;
  }
  logger.info('No WebSocket server found, initializing singleton');
  return initializeWebSocketServer();
}

export function handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
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

  let ws_connectionId = (request as any).connectionId;
  if (!ws_connectionId && request.url) {
    try {
      const urlPath = request.url || '';
      const pathParts = urlPath.split('/');
      const potentialId = pathParts[pathParts.length - 1].split('?')[0];
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
    (socket as any).__websocketHandled = true;
    wss.handleUpgrade(request, socket, head, (ws) => {
      if (ws_connectionId) {
        (ws as any).connectionId = ws_connectionId;
        console.log('Set connectionId on WebSocket object:', ws_connectionId);
      } else {
        console.warn('Cannot set connectionId on WebSocket: undefined');
      }

      ws.on('message', (message) => {
        try {
          const messageStr = message.toString();
          logger.debug('Received WebSocket message', {
            ws_connectionId: (ws as any).connectionId,
            ws_message: messageStr.substring(0, 100),
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
    if (!(socket as any).__websocketHandled) {
      socket.destroy();
    }
  }
}

export function handleMessage(ws: WebSocketConnection, message: string): void {
  logger.debug('Received raw WebSocket message', { message });
  try {
    const data = JSON.parse(message);
    const ws_connectionId = (ws as any).connectionId;
    logger.info('Parsed WebSocket message', { ws_connectionId, type: data.type });

    if (data.type === 'auth') {
      logger.info('Received auth request', {
        ws_connectionId,
        connectionType: data.connectionType,
        ssh_username: data.username || data.ssh_username,
        is_windows: data.is_windows,
      });
      if (data.connectionType === 'ssh') {
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
    } else {
      logger.warn('Unknown message type', { type: data.type });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error processing WebSocket message', { error: errorMessage });
    ws.send(
      JSON.stringify({
        error: 'Invalid message format: ' + errorMessage,
        errorType: 'INVALID_MESSAGE',
      }),
    );
  }
}

export function closeWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!global.websocketServer) {
      logger.info('No WebSocket server instance to close');
      resolve();
      return;
    }

    logger.info('Closing WebSocket server singleton');
    const closeTimeout = setTimeout(() => {
      logger.warn('WebSocket server close timed out, forcing close');
      if (global.websocketServer) {
        logger.info('Forcefully terminating all remaining WebSocket connections');
        global.websocketServer.clients.forEach((ws) => {
          try {
            ws.terminate();
          } catch (e) {}
        });
      }
      logger.info('Resetting WebSocket singleton state');
      global.websocketServer = undefined;
      global.websocketInitialized = false;
      resolve();
    }, 500);

    try {
      if (global.websocketServer && global.websocketServer.clients) {
        const clientCount = global.websocketServer.clients.size;
        logger.info(`Terminating ${clientCount} WebSocket connections`);
        global.websocketServer.clients.forEach((ws) => {
          try {
            ws.close(1001, 'Server Shutdown');
            ws.terminate();
          } catch (e) {
            logger.error(`Error terminating WebSocket client: ${e}`);
          }
        });
      }

      if (global.websocketServer) {
        global.websocketServer.close(() => {
          clearTimeout(closeTimeout);
          logger.info('WebSocket server closed successfully');
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
      global.websocketServer = undefined;
      global.websocketInitialized = false;
      resolve();
    }
  });
}
