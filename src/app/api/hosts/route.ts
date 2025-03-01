import { NextResponse } from 'next/server';

import { getHosts, createHost } from '@/lib/services';

export async function GET() {
  try {
    console.log('Fetching hosts from database...');
    const hosts = await getHosts();
    console.log('Hosts fetched successfully:', hosts);

    return NextResponse.json(hosts);
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch hosts', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

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

    const host = await createHost(data);
    console.log('Host created successfully:', host);

    return NextResponse.json(host);
  } catch (error) {
    console.error('Error creating host:', error);
    return NextResponse.json({ success: false, error: 'Failed to create host', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
