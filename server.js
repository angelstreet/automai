const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global WebSocketServer instance
let wss = null;

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize WebSocket server
  wss = new WebSocketServer({ noServer: true });
  
  console.log('[WebSocketServer] Initializing with HTTP server');
  
  // Set up ping interval for WebSocket connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    console.log('[WebSocketServer] Client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'auth') {
          console.log('[WebSocketServer] Received auth request:', {
            connectionType: data.connectionType,
            username: data.username
          });
          // Handle SSH connection here based on auth data
          // You'll need to implement SSH connection logic
        } else if (data.type === 'resize') {
          // Handle terminal resize
          console.log('[WebSocketServer] Resize request:', data);
        }
      } catch (error) {
        console.error('[WebSocketServer] Error processing message:', error);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });
  });
  
  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);
    console.log('[WebSocketServer] Received upgrade request:', pathname);
    
    // Handle terminal WebSocket connections
    if (pathname.startsWith('/api/virtualization/machines/') && pathname.endsWith('/terminal')) {
      console.log('[WebSocketServer] Handling terminal WebSocket upgrade');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      console.log('[WebSocketServer] Invalid WebSocket path:', pathname);
      socket.destroy();
    }
  });
  
  // Start listening
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server initialized and ready`);
  });
}); 