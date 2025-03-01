import dotenv from 'dotenv';

// Start timing the boot process
const startTime = Date.now();

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

// Add a shutdown flag to prevent multiple shutdown attempts
let isShuttingDown = false;

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

    // Calculate boot time
    const bootTimeInSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✓ Ready in ${bootTimeInSeconds}s`);
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
process.on('SIGINT', () => {
  console.log('Received SIGINT. Force exiting...');
  process.exit(0);
});

// Remove the listener when the process is about to exit
process.on('exit', () => {
  // Clean up by removing all listeners
  process.removeAllListeners('SIGINT');
});

// Start the server
main(); 