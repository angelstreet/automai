import { NextResponse } from 'next/server';

import { getHosts, createHost, deleteHost } from '@/lib/services/hosts';

export async function GET() {
  try {
    console.log('Fetching hosts from database...');
    const hosts = await getHosts();
    console.log('Hosts fetched successfully:', hosts);

    return NextResponse.json(hosts);
  } catch (error) {
    console.error('Error in GET /api/hosts:', error);
    return NextResponse.json({ error: 'Failed to fetch hosts' }, { status: 500 });
  }
}

/**
 * POST /api/hosts
 * Creates a new host
 * 
 * Required fields:
 * - name: string - Host name
 * - type: string - Host type (ssh, docker, portainer)
 * - ip: string - Host IP address
 * 
 * For SSH connections, also required:
 * - user: string - SSH username
 * - password: string - SSH password
 * 
 * Optional fields:
 * - description: string - Host description
 * - port: number - Host port (defaults to 22 for SSH)
 * - status: string - Initial status (defaults to 'pending')
 * 
 * @returns The created host
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Creating host with data:', data);

    // Validate required fields
    if (!data.name || !data.type || !data.ip) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: name, type, and ip are required' },
        { status: 400 },
      );
    }

    if (data.type === 'ssh' && (!data.user || !data.password)) {
      return NextResponse.json(
        { success: false, message: 'SSH connections require user and password' },
        { status: 400 },
      );
    }

    const host = await createHost({
      ...data,
    });
    console.log('Host created successfully:', host);

    return NextResponse.json(host);
  } catch (error) {
    console.error('Error creating host:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create host',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const id = request.url.split('/').pop();
    if (!id) {
      return NextResponse.json({ error: 'Host ID is required' }, { status: 400 });
    }
    await deleteHost(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/hosts:', error);
    return NextResponse.json({ error: 'Failed to delete host' }, { status: 500 });
  }
}
