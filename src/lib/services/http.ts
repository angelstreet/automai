/* eslint-disable */
import http from 'http';
import { Server } from 'http';
import { parse } from 'url';
import next from 'next';
import { NextServer } from 'next/dist/server/next';
import { initializeWebSocketServer, handleUpgrade } from './websocket';
import { logger } from '../logger';

// Server instance cache
let httpServer: Server | null = null;
let nextApp: NextServer | null = null;
let isWebSocketInitialized = false;

/**
 * Initialize the Next.js application
 */
export async function initializeNextApp(options: {
  dev?: boolean;
  hostname?: string;
  port?: number;
}): Promise<NextServer> {
  const { dev = false, hostname = 'localhost', port = 3000 } = options;

  if (nextApp) {
    logger.info('Reusing existing Next.js app');
    return nextApp;
  }

  // Create new Next.js app
  logger.info('Initializing Next.js app');
  nextApp = next({ dev, hostname, port }) as unknown as NextServer;
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
    enableWebSockets = false,
  } = options;

  // Reuse existing server if available
  if (httpServer) {
    logger.info('Reusing existing HTTP server');

    // Initialize WebSocket server if enabled and not already initialized
    if (enableWebSockets && !isWebSocketInitialized) {
      initializeWebSocketSupport(httpServer);
    }

    return httpServer;
  }

  try {
    // Initialize Next.js
    const app = await initializeNextApp({ dev, hostname, port });

    if (!app) {
      throw new Error('Failed to initialize Next.js app');
    }

    const handle = app.getRequestHandler();

    // Create HTTP server
    logger.info('Creating HTTP server');
    httpServer = http.createServer((req, res) => {
      const parsedUrl = parse(req.url || '', true);
      handle(req, res, parsedUrl);
    });

    // Initialize WebSocket server if enabled
    if (enableWebSockets) {
      initializeWebSocketSupport(httpServer);
    } else {
      // Set up upgrade handler to initialize WebSockets on-demand
      httpServer.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url || '');

        // Only handle WebSocket connections for our terminal endpoints
        if (pathname && pathname.startsWith('/terminals/')) {
          // If WebSockets aren't initialized yet, initialize them on-demand
          if (!isWebSocketInitialized) {
            logger.info('Initializing WebSocket server on-demand');
            initializeWebSocketSupport(httpServer!);
          }
          
          // Handle the terminal WebSocket upgrade
          handleUpgrade(request, socket, head, pathname);
        }
        // For all other WebSocket connections (including Next.js HMR),
        // do nothing and let Next.js handle them
      });
    }

    return httpServer;
  } catch (error) {
    logger.error(`Error creating server: ${error}`);
    throw error;
  }
}

/**
 * Initialize WebSocket support for the given server
 */
function initializeWebSocketSupport(server: Server) {
  if (isWebSocketInitialized) {
    logger.info('WebSocket server already initialized');
    return;
  }

  logger.info('Initializing WebSocket server');
  initializeWebSocketServer(server);
  isWebSocketInitialized = true;

  // Handle upgrade requests without removing existing listeners
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');

    // Handle terminal connections
    if (pathname && pathname.startsWith('/terminals/')) {
      handleUpgrade(request, socket, head, pathname);
    }
  });

  logger.info('WebSocket server initialized successfully');
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
    enableWebSockets = false,
  } = options;

  // Create server if not already created
  if (!httpServer) {
    httpServer = await createServer({ dev, hostname, port, enableWebSockets });
  }

  // Start listening with port incrementing logic
  return new Promise((resolve, reject) => {
    const tryPort = (currentPort: number, maxRetries = 10, retryCount = 0) => {
      if (retryCount >= maxRetries) {
        const error = new Error(`Could not find an available port after ${maxRetries} attempts`);
        logger.error(error.message);
        reject(error);
        return;
      }

      logger.info(`Attempting to listen on port ${currentPort}`);

      // Create a server just to test if the port is available
      const testServer = http.createServer();

      testServer.once('error', (err: NodeJS.ErrnoException) => {
        testServer.close();

        if (err.code === 'EADDRINUSE') {
          logger.info(`Port ${currentPort} in use, trying ${currentPort + 1}`);
          tryPort(currentPort + 1, maxRetries, retryCount + 1);
        } else {
          logger.error(`Error testing port ${currentPort}: ${err.message}`);
          reject(err);
        }
      });

      testServer.once('listening', () => {
        testServer.close();

        // Now that we know the port is available, start the actual server
        httpServer?.listen(currentPort, hostname, (err?: Error) => {
          if (err) {
            logger.error(`Error starting server: ${err.message}`);
            reject(err);
            return;
          }

          logger.info(`Server ready on http://${hostname}:${currentPort}`);
          resolve(httpServer as Server);
        });
      });

      testServer.listen(currentPort, hostname);
    };

    tryPort(port);
  });
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!httpServer) {
      resolve();
      return;
    }

    logger.info('Stopping server');

    // Set a timeout for the entire shutdown process
    const shutdownTimeout = setTimeout(() => {
      logger.warn('Server shutdown timed out after 5 seconds, forcing exit');
      httpServer = null;
      resolve();
    }, 5000);

    // First close WebSocket server if initialized
    if (isWebSocketInitialized) {
      try {
        const { closeWebSocketServer } = await import('./websocket');
        await closeWebSocketServer();
        isWebSocketInitialized = false;
      } catch (err) {
        logger.error(`Error closing WebSocket server: ${err}`);
      }
    }

    // Force close all connections
    httpServer.closeAllConnections();

    // Then close HTTP server
    httpServer.close((err) => {
      clearTimeout(shutdownTimeout);
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

/**
 * Get the HTTP server instance
 */
export function getServer(): Server | null {
  return httpServer;
}

/**
 * Initialize WebSockets on-demand
 */
export function initializeWebSockets(): boolean {
  if (!httpServer) {
    logger.error('Cannot initialize WebSockets: HTTP server not running');
    return false;
  }

  if (isWebSocketInitialized) {
    logger.info('WebSockets already initialized');
    return true;
  }

  initializeWebSocketSupport(httpServer);
  return true;
}
