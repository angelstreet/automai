import http from 'http';
import { Server } from 'http';
import { parse } from 'url';
import next from 'next';
import { NextServer } from 'next/dist/server/next';
import { initializeWebSocketServer, handleUpgrade } from '../websocket-server';
import { logger } from '../logger';

// Server instance cache
let httpServer: Server | null = null;
let nextApp: NextServer | null = null;

/**
 * Initialize the Next.js application
 */
export async function initializeNextApp(options: {
  dev?: boolean;
  hostname?: string;
  port?: number;
}) {
  const { dev = process.env.NODE_ENV !== 'production', hostname = 'localhost', port = 3000 } = options;
  
  // Reuse existing Next.js app if available
  if (nextApp) {
    logger.info('Reusing existing Next.js app');
    return nextApp;
  }
  
  // Create new Next.js app
  logger.info('Initializing Next.js app');
  nextApp = next({ dev, hostname, port });
  await nextApp.prepare();
  logger.info('Next.js app prepared successfully');
  
  return nextApp;
}

/**
 * Create and initialize the HTTP server with WebSocket support
 */
export async function createServer(options: {
  dev?: boolean;
  hostname?: string;
  port?: number;
  enableWebSockets?: boolean;
}): Promise<Server> {
  const { 
    dev = process.env.NODE_ENV !== 'production', 
    hostname = 'localhost', 
    port = 3000,
    enableWebSockets = true
  } = options;
  
  // Reuse existing server if available
  if (httpServer) {
    logger.info('Reusing existing HTTP server');
    return httpServer;
  }
  
  // Initialize Next.js
  const app = await initializeNextApp({ dev, hostname, port });
  const handle = app.getRequestHandler();
  
  // Create HTTP server
  logger.info('Creating HTTP server');
  httpServer = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    handle(req, res, parsedUrl);
  });
  
  // Initialize WebSocket server if enabled
  if (enableWebSockets) {
    logger.info('Initializing WebSocket server');
    initializeWebSocketServer(httpServer);
    
    // Handle WebSocket upgrade requests
    httpServer.on('upgrade', (request, socket, head) => {
      const { pathname } = parse(request.url || '');
      
      // Handle terminal connections
      if (pathname && pathname.startsWith('/terminals/')) {
        handleUpgrade(request, socket, head, pathname);
      } else {
        socket.destroy();
      }
    });
  }
  
  return httpServer;
}

/**
 * Start the server on the specified port
 */
export async function startServer(options: {
  dev?: boolean;
  hostname?: string;
  port?: number;
  enableWebSockets?: boolean;
}): Promise<Server> {
  const { 
    dev = process.env.NODE_ENV !== 'production', 
    hostname = 'localhost', 
    port = 3000,
    enableWebSockets = true
  } = options;
  
  // Create server if not already created
  if (!httpServer) {
    httpServer = await createServer({ dev, hostname, port, enableWebSockets });
  }
  
  // Start listening
  return new Promise((resolve, reject) => {
    httpServer?.listen(port, hostname, (err?: Error) => {
      if (err) {
        logger.error(`Error starting server: ${err.message}`);
        reject(err);
        return;
      }
      
      logger.info(`Server ready on http://${hostname}:${port}`);
      resolve(httpServer as Server);
    });
  });
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!httpServer) {
      resolve();
      return;
    }
    
    logger.info('Stopping server');
    httpServer.close((err) => {
      if (err) {
        logger.error(`Error stopping server: ${err.message}`);
        reject(err);
        return;
      }
      
      httpServer = null;
      logger.info('Server stopped');
      resolve();
    });
  });
} 