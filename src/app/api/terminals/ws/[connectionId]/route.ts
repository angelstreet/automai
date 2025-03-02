import { NextRequest } from 'next/server';
import { handleUpgrade } from '@/lib/services/websocket';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, context: { params: { connectionId: string } }) {
  // Extract the connection ID from the URL
  const connectionId = context.params?.connectionId;
  console.log('WebSocket connection attempt with connectionId:', connectionId);

  // Check if it's a WebSocket request
  const upgradeHeader = request.headers.get('upgrade');
  
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket request', { status: 400 });
  }
  
  try {
    // Get the raw request and socket objects
    const req = request as unknown as any;
    
    if (!req.socket) {
      return new Response('Internal server error: No socket available', { status: 500 });
    }
    
    // Store the connection ID on the request object for later use
    if (connectionId) {
      req.connectionId = connectionId;
      console.log('Setting connectionId on request:', connectionId);
    } else {
      console.error('No connectionId provided in URL');
    }
    
    // Create a promise that will resolve with the socket and response
    return new Promise<Response>((resolve) => {
      try {
        // Handle the WebSocket upgrade
        handleUpgrade(req, req.socket, Buffer.from([]));
        
        // This response is not actually used, as the WebSocket takes over
        resolve(new Response(null, { status: 101 }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        resolve(new Response('WebSocket connection failed: ' + errorMessage, { status: 500 }));
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response('WebSocket connection failed: ' + errorMessage, { status: 500 });
  }
} 