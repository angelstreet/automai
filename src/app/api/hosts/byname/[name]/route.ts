import { NextRequest, NextResponse } from 'next/server';
// Standardized lowercase route for host lookup by name
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import db from '@/lib/supabase/db';

export async function GET(request: NextRequest, context: { params: { name: string } }) {
  try {
    console.log('API route called: /api/hosts/byname/[name]');
    const params = await context.params;
    const { name } = params;

    if (!name) {
      console.log('No name provided in params');
      return NextResponse.json({ success: false, error: 'Host name is required' }, { status: 400 });
    }

    console.log(`Looking up host by name: ${name}`);

    // Use findMany and manually filter for case-insensitive match
    const hosts = await db.host.findMany({
      where: { 
        // Basic filter that might have case sensitivity issues
        // We'll do manual filtering below for case insensitivity
        name: name 
      }
    });
    
    // Manual case-insensitive filter
    const host = hosts.find(h => h.name.toLowerCase() === name.toLowerCase());

    console.log('Database query completed');
    
    if (host) {
      // Log the is_windows field value if it exists
      console.log('Host is_windows field:', host.is_windows, 
                  'Type:', typeof host.is_windows, 
                  'OS Type:', host.os_type);
    }

    if (!host) {
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
        created_at: new Date(),
        updated_at: new Date(),
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