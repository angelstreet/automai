// Load environment variables first
require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'test'
      ? '.env.test'
      : '.env.development'
});

// Import server service
const { startServer } = require('./src/lib/services/server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

async function main() {
  try {
    // Start server with WebSocket support
    await startServer({
      dev,
      hostname,
      port,
      enableWebSockets: true
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
  const { stopServer } = require('./src/lib/services/server');
  await stopServer();
  console.log('Server shut down');
  process.exit(0);
});

// Start the server
main(); 