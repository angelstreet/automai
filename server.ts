// DO NOT MODIFY THIS FILE
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

// Load environment variables before any imports that might use them
console.log('Loading environment variables...');

// First load .env
dotenv.config();

// Then load .env.local if it exists (will override .env values)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  console.log('Found .env.local, loading additional variables');
  dotenv.config({ path: envLocalPath });
}

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
    console.error('Shutdown timed out after 6s, forcing exit');
    process.exit(0);
  }, 6000); // 6 seconds to account for HTTP service's 5-second timeout

  try {
    await stopServer(true);
    console.log('Server shut down successfully');
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', () => {
  console.log('SIGINT received at:', new Date().toISOString());
  console.log('Call stack:', new Error().stack);
  console.log('Process details:', {
    pid: process.pid,
    ppid: process.ppid, // Parent process ID might reveal the sender
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: { NODE_ENV: process.env.NODE_ENV, FULL_SHUTDOWN: process.env.FULL_SHUTDOWN },
  });
  shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  console.log('SIGTERM received at:', new Date().toISOString());
  console.log('Call stack:', new Error().stack);
  console.log('Process details:', { /* ... */ });
  if (process.env.NODE_ENV === 'development') {
    console.log('Ignoring SIGTERM in development mode to keep server running');
    return;
  }
  shutdown('SIGTERM');
});
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
