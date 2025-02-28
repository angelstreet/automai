import { NextResponse } from 'next/server';

import { getHosts, createHost } from '@/lib/services';

export async function GET() {
  try {
    const hosts = await getHosts();

    return NextResponse.json({
      success: true,
      data: hosts,
    });
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch hosts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

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

    return NextResponse.json({
      success: true,
      data: host,
    });
  } catch (error) {
    console.error('Error creating host:', error);
    return NextResponse.json({ success: false, error: 'Failed to create host' }, { status: 500 });
  }
}
