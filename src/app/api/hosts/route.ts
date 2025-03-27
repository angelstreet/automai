import { NextRequest, NextResponse } from 'next/server';
import { getHosts } from '@/app/actions/hosts';
import { getUser } from '@/app/actions/user';

/**
 * API route for fetching hosts
 * Uses the cached getUser function to minimize Supabase API calls
 */
export async function GET(request: NextRequest) {
  try {
    // First check authentication using our cached user implementation
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get all hosts for this user
    const result = await getHosts();
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch hosts' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data 
    });
  } catch (error) {
    console.error('Error in hosts API route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
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
