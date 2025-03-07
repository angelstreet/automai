import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// CORS headers for API routes
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Extract parameters from the request
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Missing required code parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[API] Proxying token exchange request for code: ${code.substring(0, 5)}...`);

    // Use our Supabase server singleton
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error(`[API] Token exchange failed:`, error);
      return NextResponse.json(
        { error: `Token exchange failed: ${error.message}` },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!data?.session) {
      console.error('[API] Token exchange returned no session');
      return NextResponse.json(
        { error: 'No session returned from token exchange' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[API] Token exchange successful');

    // Return the session data to the client
    return NextResponse.json(
      { 
        session: data.session,
        user: data.user 
      }, 
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[API] Token exchange error:', error);
    return NextResponse.json(
      { error: 'Server error during token exchange' },
      { status: 500, headers: corsHeaders }
    );
  }
}