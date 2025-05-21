import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    console.log('[@api:admin-test] Testing admin privileges...');

    // Get admin client
    const adminClient = await createClient();
    console.log('[@api:admin-test] Admin client created');

    // Try to list users - a restricted operation that requires admin privileges
    const { data, error } = await adminClient.auth.admin.listUsers({});

    if (error) {
      console.error('[@api:admin-test] Error listing users:', error);
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          success: false,
        },
        { status: 500 },
      );
    }

    // Success!
    console.log(`[@api:admin-test] Successfully listed ${data?.users?.length || 0} users`);
    return NextResponse.json({
      success: true,
      message: `Admin privileges confirmed. Listed ${data?.users?.length || 0} users.`,
      userCount: data?.users?.length || 0,
    });
  } catch (error: any) {
    console.error('[@api:admin-test] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 },
    );
  }
}
