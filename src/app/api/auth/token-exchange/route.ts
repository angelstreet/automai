import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { code, supabaseUrl, apiKey } = await request.json();

    if (!code || !supabaseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[API] Proxying token exchange request for code: ${code.substring(0, 5)}...`);

    // Direct fetch to Supabase from the server
    const tokenUrl = `${supabaseUrl}/auth/v1/token?grant_type=pkce`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'X-Client-Info': 'supabase-js-server/2.38.4',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Token exchange failed: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json(
        { error: `Token exchange failed: ${response.statusText}` },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    console.log('[API] Token exchange successful');

    // Return the token data to the client
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('[API] Token exchange error:', error);
    return NextResponse.json(
      { error: 'Server error during token exchange' },
      { status: 500, headers: corsHeaders }
    );
  }
}