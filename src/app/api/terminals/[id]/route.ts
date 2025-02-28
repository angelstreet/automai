import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketServer, handleUpgrade } from '@/lib/websocketServer';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const connectionId = params.id;

  // Check if this is a WebSocket upgrade request
  const upgradeHeader = request.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return new NextResponse('Expected Upgrade: websocket', { status: 426 });
  }

  try {
    // Get the raw request object from the Next.js request
    const { socket, response } = await new Promise<{ socket: any; response: Response }>(
      (resolve) => {
        // @ts-ignore - Access internal properties
        const socket = request.socket;

        // Create a server response
        const response = new Response(null, {
          status: 101,
          headers: {
            Upgrade: 'websocket',
            Connection: 'Upgrade',
          },
        });

        resolve({ socket, response });
      },
    );

    // Get the WebSocket server
    const wss = getWebSocketServer();

    // Handle the upgrade
    const headersList = headers();
    const rawHeaders: string[] = [];
    headersList.forEach((value, key) => {
      rawHeaders.push(key, value);
    });

    // Create a minimal IncomingMessage-like object
    const req = {
      headers: Object.fromEntries(headersList.entries()),
      rawHeaders,
      url: `/terminals/${connectionId}`,
      socket,
    };

    // Handle the WebSocket upgrade
    handleUpgrade(req as any, socket, Buffer.from([]), `/terminals/${connectionId}`);

    return response;
  } catch (error) {
    console.error('Error handling WebSocket connection:', error);
    return NextResponse.json(
      { error: 'Failed to establish WebSocket connection' },
      { status: 500 },
    );
  }
}
