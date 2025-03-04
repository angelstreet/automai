import { NextResponse } from 'next/server';

import { testHostConnection } from '@/lib/services/hosts';

export async function POST(request: Request) {
  try {
    const host = await request.json();
    console.log('Test connection request:', {
      ...host,
      password: '***',
      username: host.username || 'not provided',
    });

    // Validate required fields
    if (!host.ip) {
      return NextResponse.json(
        {
          success: false,
          message: 'IP address is required',
        },
        { status: 400 },
      );
    }

    if (host.type === 'ssh' && !host.username) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username is required for SSH connections',
        },
        { status: 400 },
      );
    }

    // Log the exact parameters being passed to testHostConnection
    console.log('Calling testHostConnection with:', {
      type: host.type,
      ip: host.ip,
      port: host.port,
      username: host.username,
      hostId: host.hostId,
      // Don't log password
    });

    const result = await testHostConnection(host);
    console.log('Test connection result:', result);

    // Log the status that will be set in the database
    if (host.hostId) {
      console.log(
        `Host ${host.hostId} status will be set to: ${result.success ? 'connected' : 'failed'}`,
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/hosts/test-connection:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection',
      },
      { status: 500 },
    );
  }
}
