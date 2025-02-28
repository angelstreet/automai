const next = require('next');
const { setupHttpServer } = require('./src/server/http/routes');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });

async function startServer() {
  try {
    console.log('Preparing Next.js app...');
    await app.prepare();
    console.log('Next.js app prepared successfully');
    
    // Setup HTTP server
    console.log('Setting up HTTP server...');
    const server = setupHttpServer(app);
    console.log('HTTP server setup complete');
    
    // Start listening
    server.listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`\n✓ Ready in 0s`);
      console.log(`> Ready on http://${hostname}:${port}`);
    });
    
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer(); 