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
    await startServer({
      dev,
      hostname,
      port,
      enableWebSockets: false
    });

    console.log(`\n✓ Ready in 0s`);
    console.log(`> Ready on http://${hostname}:${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await stopServer();
  console.log('Server shut down');
  process.exit(0);
});

// Start the server
main(); 