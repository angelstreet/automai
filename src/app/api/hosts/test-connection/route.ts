import { NextResponse } from 'next/server';

import { testHostConnection } from '@/lib/services/hosts';

export async function POST(request: Request) {
  try {
    const host = await request.json();
    console.log(`Test connection request for ${host.type} at ${new Date().toISOString()}:`, {
      ...host,
      password: '***',
      username: host.username || host.user || 'not provided',
    });

    // Add cache control headers
    const headers = new Headers();
    headers.append('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.append('Pragma', 'no-cache');
    headers.append('Expires', '0');

    // Validate required fields
    if (!host.ip) {
      console.log('Validation failed: IP address is required');
      return NextResponse.json(
        {
          success: false,
          message: 'IP address is required',
        },
        { status: 400, headers },
      );
    }

    if (host.type === 'ssh' && !(host.username || host.user)) {
      console.log('Validation failed: Username is required for SSH connections');
      return NextResponse.json(
        {
          success: false,
          message: 'Username is required for SSH connections',
        },
        { status: 400, headers },
      );
    }

    // Ensure username is properly mapped from either username or user field
    const connectionData = {
      type: host.type,
      ip: host.ip,
      port: host.port,
      username: host.username || host.user,
      password: host.password,
      hostId: host.hostId,
    };

    // Log the exact parameters being passed to testHostConnection
    console.log('Calling testHostConnection with:', {
      type: connectionData.type,
      ip: connectionData.ip,
      port: connectionData.port,
      username: connectionData.username,
      hostId: connectionData.hostId,
      // Don't log password
    });

    const result = await testHostConnection(connectionData);
    console.log(`Test connection result at ${new Date().toISOString()}:`, result);

    // Log Windows detection result 
    if (result.is_windows) {
      console.log(`[Windows Detection] 🪟 Host ${host.ip} detected as Windows in API response`);
    } else {
      console.log(`[Windows Detection] Host ${host.ip} not detected as Windows in API response`);
    }

    // Log the status that will be set in the database
    if (host.hostId) {
      console.log(
        `Host ${host.hostId} status updated to: ${result.success ? 'connected' : 'failed'}, is_windows: ${result.is_windows || false}`,
      );
    }

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error(`Error in POST /api/hosts/test-connection at ${new Date().toISOString()}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection',
      },
      { status: 500 },
    );
  }
}
