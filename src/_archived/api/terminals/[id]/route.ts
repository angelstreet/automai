// ARCHIVED: This API route was archived on 2025-03-31T09:42:38.762Z
// Original path: src/app/api/terminals/[id]/route.ts
// Route: /terminals/:id
// This file is preserved for reference purposes only and is no longer in use.

import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getWebSocketServer, handleUpgrade } from '@/lib/services/websocket';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = {
  params: { id: string };
};

export async function GET(request: NextRequest, { params }: Props) {
  const connectionId = params.id;
  console.info('WebSocket connection request received', { connectionId });

  // Check if this is a WebSocket upgrade request
  const upgradeHeader = request.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    console.warn('Non-WebSocket request received', { connectionId });
    return new NextResponse('Expected Upgrade: websocket', { status: 426 });
  }

  try {
    // Get the WebSocket server (singleton instance)
    const wss = getWebSocketServer();
    if (!wss) {
      console.error('WebSocket server not initialized', { connectionId });
      return NextResponse.json({ error: 'WebSocket server not initialized' }, { status: 500 });
    }

    // Get the raw request object from the Next.js request
    const { socket, response } = await new Promise<{ socket: any; response: Response }>(
      (resolve) => {
        // @ts-expect-error - Access internal properties
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

    // Handle the upgrade
    const headersList = await headers();
    const rawHeaders: string[] = [];

    // Convert headers to array format
    Array.from(headersList.entries()).forEach(([key, value]: [string, string]) => {
      rawHeaders.push(key, value);
    });

    // Create a minimal IncomingMessage-like object
    const req = {
      headers: Object.fromEntries(Array.from(headersList.entries())),
      rawHeaders,
      url: `/terminals/${connectionId}`,
      socket,
    };

    console.info('Handling WebSocket upgrade', { connectionId });
    // Handle the WebSocket upgrade
    handleUpgrade(req as any, socket, Buffer.from([]), `/terminals/${connectionId}`);

    console.info('WebSocket connection established', { connectionId });
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error handling WebSocket connection', { error: errorMessage, connectionId });
    return NextResponse.json(
      { error: 'Failed to establish WebSocket connection', message: errorMessage },
      { status: 500 },
    );
  }
}
