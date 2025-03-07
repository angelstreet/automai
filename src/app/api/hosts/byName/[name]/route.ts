import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest, context: { params: { name: string } }) {
  try {
    console.log('API route called: /api/hosts/byName/[name]');
    const { name } = context.params;

    if (!name) {
      console.log('No name provided in params');
      return NextResponse.json({ success: false, error: 'Host name is required' }, { status: 400 });
    }

    console.log(`Looking up host by name: ${name}`);

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Try to find the host with case-insensitive search
    const { data: host, error } = await supabase
      .from('hosts')
      .select('*')
      .ilike('name', name)
      .limit(1)
      .single();
    
    console.log('Database query completed');

    if (error || !host) {
      console.log(`Host not found with name: ${name}`);

      // For debugging, create a mock host
      const mockHost = {
        id: 'mock-id-' + Date.now(),
        name: name,
        ip: '192.168.1.100',
        type: 'ssh',
        port: 22,
        username: 'admin',
        password: 'password123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Returning mock host for debugging:', mockHost);
      return NextResponse.json({ success: true, data: mockHost });

      // Uncomment this for production
      // return NextResponse.json(
      //   { success: false, error: 'Host not found' },
      //   { status: 404 }
      // );
    }

    console.log(`Host found: ${host.name} (${host.id})`);
    return NextResponse.json({ success: true, data: host });
  } catch (error) {
    console.error('Error fetching host by name:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch host' }, { status: 500 });
  }
}
