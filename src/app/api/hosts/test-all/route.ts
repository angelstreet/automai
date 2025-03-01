import { NextResponse } from 'next/server';
import { getHosts, testHostConnection } from '@/lib/services/hosts';

export async function GET() {
  try {
    // Get all hosts
    const hosts = await getHosts();
    console.log(`Testing connections for ${hosts.length} hosts`);
    
    // Test connection for each host
    const results = await Promise.all(
      hosts.map(async (host) => {
        try {
          const result = await testHostConnection({
            type: host.type,
            ip: host.ip,
            port: host.port,
            username: host.user,
            password: host.password,
            hostId: host.id,
          });
          
          return {
            id: host.id,
            name: host.name,
            success: result.success,
            message: result.message,
          };
        } catch (error) {
          console.error(`Error testing connection for host ${host.id}:`, error);
          return {
            id: host.id,
            name: host.name,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );
    
    console.log('All connection tests completed:', results);
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error in GET /api/hosts/test-all:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to test connections',
        results: []
      },
      { status: 500 }
    );
  }
} 