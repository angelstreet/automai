/* eslint-disable */
import { WebSocketServer, WebSocket } from 'ws';
// @ts-ignore - Add ts-ignore for the websockify import since it doesn't have type definitions
import { createProxyServer } from 'websockify';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { WebSocketConnection } from '@/types/component/sshComponentType';

function handleSshConnection(ws: WebSocketConnection, connectionId: string, options: any) {
  console.log('[@service:websocket:handleSshConnection] Handling SSH connection', {
    connectionId,
    ssh_host: options.ssh_host,
  });

  try {
    // Get the terminal session from terminalService
    const getSession = async () => {
      const terminalService = (await import('./terminalService')).default;
      return await terminalService.getTerminalSession(connectionId);
    };

    getSession()
      .then((session) => {
        if (!session) {
          console.error('[@service:websocket:handleSshConnection] Session not found', {
            connectionId,
          });
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'Session not found',
              connectionId,
            }),
          );
          return;
        }

        if (!session.sshConnected) {
          console.error('[@service:websocket:handleSshConnection] SSH not connected', {
            connectionId,
          });
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'SSH connection not established',
              connectionId,
            }),
          );
          return;
        }

        console.log('[@service:websocket:handleSshConnection] SSH session found and connected', {
          connectionId,
          hostId: session.hostId,
        });

        // Send connected confirmation
        ws.send(
          JSON.stringify({
            type: 'connected',
            message: 'SSH connection established',
            connectionId,
          }),
        );
      })
      .catch((error) => {
        console.error('[@service:websocket:handleSshConnection] Error getting session', {
          error: error.message,
          connectionId,
        });
        ws.send(
          JSON.stringify({
            type: 'error',
            error: error.message,
            connectionId,
          }),
        );
      });
  } catch (error) {
    console.error('[@service:websocket:handleSshConnection] Error in SSH connection handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      connectionId,
    });
    ws.send(
      JSON.stringify({
        type: 'error',
        error: 'SSH connection handler error',
        connectionId,
      }),
    );
  }
}

interface ExtendedWebSocket extends WebSocket {
  ws_isAlive?: boolean;
}

declare global {
  var websocketServer: WebSocketServer | undefined;
  var websocketInitialized: boolean | undefined;
}

export function initializeWebSocketServer(): WebSocketServer {
  if (global.websocketServer) {
    console.info('Using existing WebSocket server singleton instance');
    return global.websocketServer;
  }

  global.websocketInitialized = true;

  try {
    console.info('Creating new WebSocket server singleton instance');
    const wss = new WebSocketServer({ noServer: true });
    global.websocketServer = wss;

    const pingInterval = setInterval(() => {
      if (!global.websocketServer) {
        console.info('Clearing ping interval as WebSocket server no longer exists');
        clearInterval(pingInterval);
        return;
      }
      console.debug('Running WebSocket ping check');
      wss.clients.forEach((client) => {
        const extClient = client as ExtendedWebSocket;
        if (extClient.ws_isAlive === false) {
          console.info('Terminating inactive WebSocket connection', {
            ws_connectionId: (client as any).connectionId,
          });
          return client.terminate();
        }
        extClient.ws_isAlive = false;
        client.ping();
      });
    }, 30000);

    wss.on('close', () => {
      console.info('WebSocket server closed, clearing ping interval');
      clearInterval(pingInterval);
    });

    wss.on('connection', (ws: ExtendedWebSocket, req: IncomingMessage) => {
      console.info('Client connected to WebSocket server', { ws_ip: req.socket.remoteAddress });
      ws.ws_isAlive = true;

      // Check if this is a VNC connection
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const isVncConnection = url.pathname.startsWith('/vnc') || url.searchParams.has('vnc_host');
      const vncHost = url.searchParams.get('vnc_host');
      const vncPort = url.searchParams.get('vnc_port') || '5900';

      if (isVncConnection && vncHost) {
        console.info('Handling VNC WebSocket connection', { vncHost, vncPort });
        try {
          createProxyServer(ws, {
            target: { host: vncHost, port: parseInt(vncPort) },
          });
          ws.on('error', (error) => {
            console.error('VNC WebSocket error', { error: error.message });
          });
          ws.on('close', () => {
            console.info('VNC WebSocket connection closed', { vncHost, vncPort });
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Failed to proxy VNC connection', { error: errorMessage });
          ws.close(1011, 'VNC proxy error');
        }
        return; // Skip SSH logic for VNC connections
      }

      // Existing SSH connection logic
      ws.on('pong', () => {
        console.debug('Received pong from client', { ws_connectionId: (ws as any).connectionId });
        ws.ws_isAlive = true;
      });

      ws.on('close', (code, reason) => {
        console.info('Client disconnected from WebSocket server', {
          ws_connectionId: (ws as any).connectionId,
          code,
          reason: reason.toString(),
          timestamp: new Date().toISOString(),
        });
      });

      ws.on('error', (error) => {
        console.error('WebSocket error', {
          ws_connectionId: (ws as any).connectionId,
          error: error.message,
        });
      });

      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket established' }));
      console.debug('Sent connection confirmation to client', {
        ws_connectionId: (ws as any).connectionId,
      });
    });

    console.info('WebSocket server singleton initialized successfully');
    return wss;
  } catch (error) {
    console.error(`WebSocket server initialization failed: ${error}`);
    global.websocketInitialized = false;
    const dummyServer = new WebSocketServer({ noServer: true });
    global.websocketServer = dummyServer;
    return dummyServer;
  }
}

// Keep existing functions unchanged
export function getWebSocketServer(): WebSocketServer {
  if (global.websocketServer) {
    return global.websocketServer;
  }
  if (global.websocketInitialized) {
    console.info('WebSocket initialization in progress, creating temporary instance');
    const tempServer = new WebSocketServer({ noServer: true });
    return tempServer;
  }
  console.info('No WebSocket server found, initializing singleton');
  return initializeWebSocketServer();
}

export function handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
  if ((socket as any).__websocketHandled) {
    console.info('Skipping already handled socket');
    return;
  }

  console.log('handleUpgrade called with request headers:', request.headers);
  console.log('handleUpgrade request URL:', request.url);

  const wss = getWebSocketServer();
  if (!wss) {
    console.error('No WebSocket server instance available');
    socket.destroy();
    return;
  }

  console.info('Handling WebSocket upgrade request');

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

  try {
    (socket as any).__websocketHandled = true;
    wss.handleUpgrade(request, socket, head, (ws) => {
      if (ws_connectionId) {
        (ws as any).connectionId = ws_connectionId;
        console.log('Set connectionId on WebSocket object:', ws_connectionId);
      }

      ws.on('message', (message) => {
        try {
          const messageStr = message.toString();
          console.debug('Received WebSocket message', {
            ws_connectionId: (ws as any).connectionId,
            ws_message: messageStr.substring(0, 100),
          });
          handleMessage(ws as WebSocketConnection, messageStr);
        } catch (error) {
          console.error('Error handling WebSocket message', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      wss.emit('connection', ws, request);
    });
  } catch (error) {
    console.error('Error in WebSocket upgrade', {
      error: error instanceof Error ? error.message : String(error),
      ws_connectionId,
    });
    if (!(socket as any).__websocketHandled) {
      socket.destroy();
    }
  }
}

export function handleMessage(ws: WebSocketConnection, message: string): void {
  console.debug('[@service:websocket:handleMessage] Received WebSocket message', { message });
  try {
    const data = JSON.parse(message);
    const ws_connectionId = (ws as any).connectionId;
    console.info('[@service:websocket:handleMessage] Parsed WebSocket message', {
      ws_connectionId,
      type: data.type,
    });

    if (data.type === 'connect') {
      // Handle SSH connection request from TerminalEmulator
      console.info('[@service:websocket:handleMessage] SSH connect request', {
        ws_connectionId,
        host: data.host,
        username: data.username,
      });

      handleSshConnection(ws, ws_connectionId, {
        ssh_host: data.host,
        ssh_port: data.port,
        ssh_username: data.username,
        ssh_password: data.password,
      });
    } else if (data.type === 'input') {
      // Handle terminal input data
      console.debug('[@service:websocket:handleMessage] Terminal input received', {
        ws_connectionId,
        dataLength: data.data?.length || 0,
      });

      // Send input to terminal session
      handleTerminalInput(ws, ws_connectionId, data.data);
    } else if (data.type === 'resize') {
      // Handle terminal resize
      console.debug('[@service:websocket:handleMessage] Terminal resize', {
        ws_connectionId,
        cols: data.cols,
        rows: data.rows,
      });
      // TODO: Implement resize handling if needed
    } else if (data.type === 'auth') {
      // Legacy auth handling
      console.info('[@service:websocket:handleMessage] Legacy auth request', {
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
        console.error('[@service:websocket:handleMessage] Unsupported connection type', {
          type: data.connectionType,
        });
        ws.send(
          JSON.stringify({
            error: `Unsupported connection type: ${data.connectionType}`,
            errorType: 'UNSUPPORTED_CONNECTION_TYPE',
          }),
        );
      }
    } else {
      console.warn('[@service:websocket:handleMessage] Unknown message type', { type: data.type });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[@service:websocket:handleMessage] Error processing WebSocket message', {
      error: errorMessage,
    });
    ws.send(
      JSON.stringify({
        error: 'Invalid message format: ' + errorMessage,
        errorType: 'INVALID_MESSAGE',
      }),
    );
  }
}

// Add terminal input handler function
async function handleTerminalInput(
  ws: WebSocketConnection,
  connectionId: string,
  inputData: string,
) {
  try {
    console.debug('[@service:websocket:handleTerminalInput] Processing terminal input', {
      connectionId,
      dataLength: inputData?.length || 0,
    });

    // Get terminal service and send data
    const terminalService = (await import('./terminalService')).default;
    const result = await terminalService.sendDataToSession(connectionId, inputData);

    if (result.success && result.data) {
      // Send command output back to terminal
      if (result.data.stdout) {
        ws.send(
          JSON.stringify({
            type: 'data',
            data: result.data.stdout,
          }),
        );
      }
      if (result.data.stderr) {
        ws.send(
          JSON.stringify({
            type: 'data',
            data: result.data.stderr,
          }),
        );
      }
    }
  } catch (error) {
    console.error('[@service:websocket:handleTerminalInput] Error handling terminal input', {
      error: error instanceof Error ? error.message : 'Unknown error',
      connectionId,
    });

    ws.send(
      JSON.stringify({
        type: 'error',
        error: 'Failed to process terminal input',
      }),
    );
  }
}

export function closeWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!global.websocketServer) {
      console.info('No WebSocket server instance to close');
      resolve();
      return;
    }

    console.info('Closing WebSocket server singleton');
    const closeTimeout = setTimeout(() => {
      console.warn('WebSocket server close timed out, forcing close');
      if (global.websocketServer) {
        console.info('Forcefully terminating all remaining WebSocket connections');
        global.websocketServer.clients.forEach((ws) => {
          try {
            ws.terminate();
          } catch (e) {}
        });
      }
      console.info('Resetting WebSocket singleton state');
      global.websocketServer = undefined;
      global.websocketInitialized = false;
      resolve();
    }, 500);

    try {
      if (global.websocketServer && global.websocketServer.clients) {
        const clientCount = global.websocketServer.clients.size;
        console.info(`Terminating ${clientCount} WebSocket connections`);
        global.websocketServer.clients.forEach((ws) => {
          try {
            ws.close(1001, 'Server Shutdown');
            ws.terminate();
          } catch (e) {
            console.error(`Error terminating WebSocket client: ${e}`);
          }
        });
      }

      if (global.websocketServer) {
        global.websocketServer.close(() => {
          clearTimeout(closeTimeout);
          console.info('WebSocket server closed successfully');
          global.websocketServer = undefined;
          global.websocketInitialized = false;
          resolve();
        });
      } else {
        clearTimeout(closeTimeout);
        resolve();
      }
    } catch (e) {
      console.error(`Error during WebSocket server close: ${e}`);
      clearTimeout(closeTimeout);
      global.websocketServer = undefined;
      global.websocketInitialized = false;
      resolve();
    }
  });
}
