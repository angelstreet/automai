import { NextRequest, NextResponse } from 'next/server';

/**
 * This is a debugging endpoint to check if a tenant exists
 * Example: /api/debug/tenant/a317a10a-776a-47de-9347-81806b36a03e
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    console.log('Debug API: Checking tenant with ID:', tenantId);
    
    // This endpoint is deprecated after the consolidation of tenant functions
    // into the user actions file
    
    // Check if the tenant exists
    const result = await checkTenantExists(tenantId);
    
    // Log the result for server-side debugging
    console.log('Debug API: Tenant check result:', JSON.stringify(result, null, 2));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Debug API: Error checking tenant:', error);
    return NextResponse.json(
      { error: 'Failed to check tenant', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 