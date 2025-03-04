import dotenv from 'dotenv';

// Load environment variables before any imports that might use them
const envFile = (() => {
  switch (process.env.NODE_ENV as 'development' | 'production' | 'test' | 'codespace') {
    case 'production':
      return '.env.production';
    case 'test':
      return '.env.test';
    case 'codespace':
      return '.env.codespace';
    default:
      return '.env.development';
  }
})();

console.log(`Loading environment from ${envFile}`);
dotenv.config({ path: envFile });

// Now import modules that depend on environment variables
import { startServer, stopServer } from './src/lib/services/http';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Track shutdown status to prevent duplicate signals
let isShuttingDown = false;

async function main() {
  try {
    const startTime = Date.now();
    
    // Start server without WebSocket support by default
    // WebSockets will be lazily initialized when needed
    const server = await startServer({
      dev,
      hostname,
      port,
      enableWebSockets: false,
    });

    // Get the actual port the server is listening on
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    
    const launchTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✓ Ready in ${launchTime}s`);
    console.log(`> Ready on http://${hostname}:${actualPort}`);
  } catch (err) {
    // Don't exit on EADDRINUSE as it's handled by startServer
    if (err instanceof Error && 'code' in err && err.code === 'EADDRINUSE') {
      console.log('Port handling is managed by the HTTP service');
    } else {
      console.error('Error starting server:', err);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
async function shutdown(signal: string) {
  // Skip if shutdown is already in progress
  if (isShuttingDown) {
    console.log(`Ignoring additional ${signal} signal, shutdown already in progress`);
    return;
  }

  // Set flag to prevent multiple shutdown procedures
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Shutting down server...`);

  // Force exit immediately on second SIGINT
  if (signal === 'SIGINT') {
    process.on('SIGINT', () => {
      console.log('Forced exit by user');
      process.exit(0);
    });
  }

  // Set a timeout to force exit if shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error('Shutdown timed out after 1s, forcing exit');
    process.exit(0);
  }, 1000);

  try {
    await stopServer();
    console.log('Server shut down successfully');
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    clearTimeout(forceExitTimeout);
    process.exit(0);
  }
}

// Handle termination signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  // Don't shut down for EADDRINUSE errors
  if (err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE') {
    console.log('Port in use, waiting for port incrementing logic to handle it...');
    return;
  }

  console.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});

// Start the server
main();