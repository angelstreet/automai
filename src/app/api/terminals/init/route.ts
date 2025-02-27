import { WebSocketServer } from '@/lib/websocket-server';

export async function GET() {
  try {
    const wss = new WebSocketServer();
    return new Response('WebSocket server initialized', { status: 200 });
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
    return new Response('Failed to initialize WebSocket server', { status: 500 });
  }
}
