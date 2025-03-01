import { NextRequest } from 'next/server';
import { handleUpgrade } from '@/lib/services/websocket';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  logger.info('WebSocket route handler called', { 
    connectionId: context.params.id,
    headers: Object.fromEntries(request.headers.entries())
  });
  
  // Check if it's a WebSocket request
  const upgradeHeader = request.headers.get('upgrade');
  
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    logger.error('Not a WebSocket request', { 
      upgradeHeader,
      headers: Object.fromEntries(request.headers.entries())
    });
    return new Response('Expected WebSocket request', { status: 400 });
  }
  
  try {
    // Extract the connection ID from the URL
    const connectionId = context.params.id;
    logger.info('WebSocket connection request', { connectionId });
    
    // Get the raw request and socket objects
    const req = request as unknown as any;
    
    if (!req.socket) {
      logger.error('No socket found on request object', { 
        requestKeys: Object.keys(req),
        hasSocket: !!req.socket
      });
      return new Response('Internal server error: No socket available', { status: 500 });
    }
    
    // Store the connection ID on the request object for later use
    req.connectionId = connectionId;
    
    // Create a promise that will resolve with the socket and response
    return new Promise<Response>((resolve) => {
      try {
        logger.info('Attempting WebSocket upgrade', { connectionId });
        
        // Handle the WebSocket upgrade
        handleUpgrade(
          req, 
          req.socket, 
          Buffer.from([]),
        );
        
        logger.info('WebSocket upgrade successful', { connectionId });
        
        // This response is not actually used, as the WebSocket takes over
        resolve(new Response(null, { status: 101 }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error handling WebSocket upgrade', { 
          error: errorMessage,
          connectionId,
          stack: error instanceof Error ? error.stack : undefined
        });
        resolve(new Response('WebSocket connection failed: ' + errorMessage, { status: 500 }));
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('WebSocket connection error', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response('WebSocket connection failed: ' + errorMessage, { status: 500 });
  }
} 