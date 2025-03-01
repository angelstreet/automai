import dotenv from 'dotenv';

// Load environment variables before any imports that might use them
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : process.env.NODE_ENV === 'test'
    ? '.env.test'
    : '.env.development';

console.log(`Loading environment from ${envFile}`);
dotenv.config({ path: envFile });

// Now import modules that depend on environment variables
import { startServer, stopServer } from './src/lib/services/http';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

async function main() {
  try {
    // Start server without WebSocket support by default
    // WebSockets will be lazily initialized when needed
    const server = await startServer({
      dev,
      hostname,
      port,
      enableWebSockets: false
    });

    // Get the actual port the server is listening on
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;

    console.log(`\n✓ Ready in 0s`);
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
  console.log(`\nReceived ${signal}. Shutting down server...`);
  
  // Set a timeout to force exit if shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error('Shutdown timed out after 10s, forcing exit');
    process.exit(1);
  }, 10000);
  
  try {
    await stopServer();
    console.log('Server shut down successfully');
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});

// Start the server
main(); 