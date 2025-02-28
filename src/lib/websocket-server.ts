import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { logger } from './logger';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { Client } from 'ssh2';
import { prisma } from './prisma';

// Extend global to include our WebSocketServer
declare global {
  var wss: WSServer | null;
  var pingInterval: NodeJS.Timeout | null;
}

// Define WebSocketConnection type
export type WebSocketConnection = WebSocket & {
  isAlive?: boolean;
  authTimeout?: NodeJS.Timeout;
};

// Local WebSocketServer instance
let wss: WSServer | null = global.wss || null;
let pingInterval: NodeJS.Timeout | null = global.pingInterval || null;
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

  // Check if we already have a global WebSocketServer
  if (global.wss) {
    console.log('[WebSocketServer] Using global WebSocketServer instance');
    wss = global.wss;
    return;
  }

  // If no global instance, create a new one
  if (!wss) {
    console.log('[WebSocketServer] Creating new WebSocketServer instance');
    wss = new WSServer({ noServer: true });
    global.wss = wss;

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
    global.pingInterval = pingInterval;

    wss.on('close', () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
        global.pingInterval = null;
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
        console.error('[WebSocketServer] No connection ID found in URL:', pathname);
        ws.send(JSON.stringify({ 
          error: 'Invalid connection ID',
          errorType: 'INVALID_CONNECTION_ID'
        }));
        return;
      }
      
      console.log('[WebSocketServer] Connection ID:', connectionId);
      
      // Set up authentication timeout (5 seconds)
      const authTimeout = setTimeout(() => {
        console.log('[WebSocketServer] Authentication timeout for connection:', connectionId);
        ws.send(JSON.stringify({ 
          error: 'Authentication timeout',
          errorType: 'AUTH_TIMEOUT'
        }));
        ws.terminate();
      }, 5000);
      
      // Store the timeout in the socket for later cleanup
      ws.authTimeout = authTimeout;
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'auth') {
            console.log('[WebSocketServer] Received auth request:', {
              connectionType: data.connectionType,
              username: data.username
            });
            
            // Clear authentication timeout
            clearTimeout(authTimeout);
            delete ws.authTimeout;
            
            // Fetch connection details from database
            try {
              console.log('[WebSocketServer] Looking up connection in database:', connectionId);
              
              const connection = await prisma.connection.findUnique({
                where: { id: connectionId }
              });
              
              if (!connection) {
                console.error('[WebSocketServer] Connection not found:', connectionId);
                ws.send(JSON.stringify({ 
                  error: 'Connection not found',
                  errorType: 'CONNECTION_NOT_FOUND'
                }));
                return;
              }
              
              console.log('[WebSocketServer] Found connection:', { 
                id: connection.id, 
                type: connection.type 
              });
              
              // Update connection with auth data if provided
              let connectionData = { ...connection };
              if (data.username) connectionData.username = data.username;
              if (data.password) connectionData.password = data.password;
              
              // Handle SSH connection
              if (connection.type === 'ssh') {
                console.log('[WebSocketServer] Handling SSH connection');
                handleSshConnection(ws, connectionData, connectionId);
              } else {
                console.error('[WebSocketServer] Unsupported connection type:', connection.type);
                ws.send(JSON.stringify({ 
                  error: `Unsupported connection type: ${connection.type}`,
                  errorType: 'UNSUPPORTED_CONNECTION_TYPE'
                }));
              }
            } catch (dbError: unknown) {
              console.error('[WebSocketServer] Database error:', dbError);
              const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
              ws.send(JSON.stringify({ 
                error: 'Database error: ' + errorMessage,
                errorType: 'DATABASE_ERROR'
              }));
            }
          } else if (data.type === 'resize') {
            // Handle terminal resize - this will be handled by the SSH connection
            console.log('[WebSocketServer] Resize request:', data);
          }
        } catch (error) {
          console.error('[WebSocketServer] Error processing message:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          ws.send(JSON.stringify({ 
            error: 'Invalid message format: ' + errorMessage,
            errorType: 'INVALID_MESSAGE'
          }));
        }
      });
      
      ws.on('close', () => {
        // Clear any pending timeouts
        if (ws.authTimeout) {
          clearTimeout(ws.authTimeout);
          delete ws.authTimeout;
        }
        console.log('[WebSocketServer] Client disconnected');
      });
    });
  }
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WSServer {
  // Check if we have a global WebSocketServer
  if (global.wss) {
    return global.wss;
  }

  // If no global instance, use or create the local one
  if (!wss) {
    console.log('[WebSocketServer] Creating WebSocketServer instance on demand');
    wss = new WSServer({ noServer: true });
    global.wss = wss;

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
    global.pingInterval = pingInterval;

    wss.on('close', () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
        global.pingInterval = null;
      }
    });

    // Set up connection handler
    wss.on('connection', (ws: WebSocketConnection, request: IncomingMessage) => {
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

// Implement SSH connection handler
function handleSshConnection(clientSocket: WebSocketConnection, connection: any, connectionId: string) {
  console.log('[SSH] Establishing connection to:', {
    host: connection.ip,
    port: connection.port || 22,
    username: connection.username
  });
  
  // Clear any existing auth timeout
  const authTimeout = clientSocket.authTimeout;
  if (authTimeout) {
    clearTimeout(authTimeout);
    delete clientSocket.authTimeout;
  }
  
  const sshClient = new Client();
  
  sshClient.on('ready', () => {
    console.log('[SSH] Connection ready');
    
    // Send connection status to client
    clientSocket.send(JSON.stringify({
      status: 'connected',
      message: 'SSH connection established successfully'
    }));
    
    // Create an SSH shell session
    sshClient.shell((err, stream) => {
      if (err) {
        const errorMessage = `SSH shell error: ${err.message}`;
        console.error('[SSH] Shell error:', errorMessage);
        clientSocket.send(JSON.stringify({ 
          error: errorMessage,
          errorType: 'SSH_SHELL_ERROR',
          details: {
            host: connection.ip,
            port: connection.port || 22
          }
        }));
        return;
      }
      
      // Pipe data from SSH to WebSocket
      stream.on('data', (data: Buffer) => {
        clientSocket.send(data);
      });
      
      // Handle WebSocket messages
      clientSocket.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle resize event
          if (data.type === 'resize') {
            console.log('[SSH] Terminal resize:', data);
            stream.setWindow(data.rows, data.cols, 0, 0);
          }
        } catch (e) {
          // Not JSON data, treat as terminal input
          stream.write(message);
        }
      });
      
      // Handle stream close
      stream.on('close', () => {
        console.log('[SSH] Stream closed');
        clientSocket.close();
      });
      
      // Handle stream errors
      stream.on('error', (err: Error) => {
        console.error('[SSH] Stream error:', err.message);
        clientSocket.send(JSON.stringify({ 
          error: `SSH stream error: ${err.message}`,
          errorType: 'SSH_STREAM_ERROR'
        }));
      });
    });
  });
  
  // Handle SSH client errors
  sshClient.on('error', (err) => {
    console.error('[SSH] Connection error:', err.message);
    clientSocket.send(JSON.stringify({ 
      error: `SSH connection error: ${err.message}`,
      errorType: 'SSH_CONNECTION_ERROR',
      details: {
        host: connection.ip,
        port: connection.port || 22
      }
    }));
  });
  
  // Connect to SSH server
  sshClient.connect({
    host: connection.ip,
    port: connection.port || 22,
    username: connection.username,
    password: connection.password,
    readyTimeout: 10000 // 10 seconds timeout
  });
  
  // Handle WebSocket close
  clientSocket.on('close', () => {
    console.log('[SSH] WebSocket closed, ending SSH connection');
    sshClient.end();
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
        } catch (error: unknown) {
          const logOptions = {
            error: error instanceof Error ? error.message : 'Unknown error',
            context: 'WebSocket message parsing'
          };
          logger.error('Failed to parse WebSocket message', logOptions);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('error', (error: Error) => {
        const logOptions = {
          error: error.message,
          context: 'WebSocket connection'
        };
        logger.error('WebSocket error', logOptions);
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
