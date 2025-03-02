import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

  // Return a successful WebSocket upgrade response
  // The actual upgrade is handled by the HTTP server's upgrade handler
  // This route exists only for Next.js routing purposes
  return new Response(null, { status: 101 });
} 