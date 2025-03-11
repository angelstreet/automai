/* eslint-disable */
import http from 'http';
import { Server } from 'http';
import { parse } from 'url';
// We need to use the direct import here for the custom server
// This will generate a warning during build but is required for the custom server to work
import next from 'next';
import { NextServer } from 'next/dist/server/next';
import { initializeWebSocketServer, handleUpgrade } from './websocket';
import { logger } from '../logger';
import { Socket } from 'net';

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
  try {
    nextApp = next({
      dev,
      hostname,
      port,
      // Add 'dir' option to make sure Next.js looks in the right directory
      dir: process.cwd(),
    }) as unknown as NextServer;
    await nextApp.prepare();
    logger.info('Next.js app prepared successfully');
  } catch (error) {
    logger.error(
      'Failed to prepare Next.js app: ' + (error instanceof Error ? error.message : String(error)),
    );
    throw error;
  }

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
      try {
        const parsedUrl = parse(req.url || '', true);

        // Special handling for common Next.js system paths
        if (
          req.url?.startsWith('/_next/') 
          // App Router doesn't use these Pages Router special files
          // req.url === '/_document' ||
          // req.url === '/_app' ||
          // req.url === '/_error'
        ) {
          console.log(`Handling Next.js system page: ${req.url}`);
        }

        // Let the Next.js request handler manage the request
        handle(req, res, parsedUrl);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error handling request for ${req.url}: ${errorMessage}`);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Set max listeners to avoid warnings
    httpServer.setMaxListeners(20);

    // Initialize WebSocket server if enabled
    if (enableWebSockets) {
      initializeWebSocketSupport(httpServer);
    } else {
      // Set up upgrade handler to initialize WebSockets on-demand
      httpServer.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url || '');

        // Only handle WebSocket connections for our terminal endpoints
        if (pathname && pathname.startsWith('/api/terminals/ws/')) {
          // If WebSockets aren't initialized yet, initialize them on-demand
          if (!isWebSocketInitialized) {
            logger.info('Initializing WebSocket server on-demand');
            initializeWebSocketSupport(httpServer!);
          }

          // Handle the terminal WebSocket upgrade
          handleUpgrade(request, socket as Socket, head);
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
  initializeWebSocketServer();
  isWebSocketInitialized = true;

  // Handle upgrade requests without removing existing listeners
  server.on('upgrade', (request, socket, head) => {
    // Check if this request is already being handled
    if ((request as any).__isHandlingUpgrade) {
      logger.info('Skipping already handled WebSocket upgrade request');
      socket.destroy();
      return;
    }

    const { pathname } = parse(request.url || '');
    const pathnameStr = pathname || '';
    logger.info('Upgrade request received', { pathname: pathnameStr });

    // Only handle terminal connections and let Next.js handle its own WebSocket connections
    if (pathnameStr && pathnameStr.startsWith('/api/terminals/ws/')) {
      try {
        // Mark this request as being handled to prevent double handling
        (request as any).__isHandlingUpgrade = true;

        // Extract connection ID from URL
        const connectionId = pathnameStr.split('/').pop();
        if (connectionId) {
          logger.info('Handling terminal WebSocket upgrade', { connectionId });
          (request as any).connectionId = connectionId;
          handleUpgrade(request, socket as Socket, head);
        } else {
          logger.error('Invalid terminal WebSocket URL', { pathname: pathnameStr });
          socket.destroy();
        }
      } catch (error) {
        // Log error but don't crash server
        logger.error('Error handling WebSocket upgrade', {
          error: error instanceof Error ? error.message : String(error),
          pathname: pathnameStr,
        });
        socket.destroy();
      }
    } else {
      // Let Next.js handle other WebSocket connections
      logger.info('Letting Next.js handle WebSocket upgrade', { pathname: pathnameStr });
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
export async function stopServer(forceFullShutdown: boolean = false): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!httpServer) {
      logger.info('No HTTP server to stop, already shut down');
      resolve();
      return;
    }

    const startTime = Date.now();
    logger.info('Starting server shutdown process');

    // Count active connections for diagnostics
    let activeConnections = 0;
    if (httpServer && typeof httpServer.getConnections === 'function') {
      activeConnections = await new Promise<number>((res) => {
        httpServer!.getConnections((_, count) => res(count || 0));
      });
    }

    logger.info(`Server shutdown: ${activeConnections} active connections`);

    // Set a timeout for the entire shutdown process - increased to 5 seconds
    const shutdownTimeout = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.warn(`Server shutdown timed out after ${elapsed}s, forcing exit`);

      // Remove all listeners to prevent memory leaks
      if (httpServer) {
        httpServer.removeAllListeners();
      }

      httpServer = null;
      resolve();
    }, 5000);

    // Handle WebSocket server shutdown in parallel without blocking the HTTP server shutdown
    if (isWebSocketInitialized && forceFullShutdown) {
      const { closeWebSocketServer } = await import('./websocket');
      await closeWebSocketServer();
      isWebSocketInitialized = false;
    }
    if (forceFullShutdown) {
      httpServer.closeAllConnections();
      httpServer.close((err) => {
        /* ... */
      });
    } else {
      logger.info('Partial shutdown: Keeping HTTP server alive');
      resolve();
    }

    // Remove all upgrade listeners to prevent memory leaks
    if (httpServer) {
      logger.info('Removing HTTP server upgrade listeners');
      httpServer.removeAllListeners('upgrade');
    }

    // Force close all connections
    logger.info('Forcefully closing all HTTP connections');
    httpServer.closeAllConnections();

    // Then close HTTP server with a longer timeout (2 seconds)
    const serverCloseTimeout = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.warn(`HTTP server close timed out after ${elapsed}s, forcing close`);
      httpServer = null;
      clearTimeout(shutdownTimeout);
      resolve();
    }, 2000);

    logger.info('Gracefully closing HTTP server');
    httpServer.close((err) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      clearTimeout(serverCloseTimeout);
      clearTimeout(shutdownTimeout);

      if (err) {
        logger.error(`Error stopping server after ${elapsed}s: ${err.message}`);
        reject(err);
        return;
      }

      httpServer = null;
      logger.info(`HTTP server closed successfully in ${elapsed}s`);
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
