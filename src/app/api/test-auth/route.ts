import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Test function to check if a Supabase token is valid
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (!accessToken) {
      return NextResponse.json({ error: 'No access_token provided' }, { status: 400 });
    }

    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-public-anon-key';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to set the session with the token
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: {
            name: error.name,
            status: error.status,
          },
        },
        { status: 400 },
      );
    }

    if (!data?.session) {
      return NextResponse.json(
        {
          success: false,
          error: 'No session returned',
          data,
        },
        { status: 400 },
      );
    }

    // Decode token for debugging (without exposing sensitive details)
    let decodedToken = null;
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        decodedToken = {
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
          session_id: payload.session_id,
        };
      }
    } catch (e) {
      console.error('Error decoding token:', e);
    }

    // Return success with limited session info
    return NextResponse.json({
      success: true,
      session: {
        expires_at: data.session.expires_at,
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
          role: data.session.user.role,
        },
        token_type: data.session.token_type,
      },
      decoded_token: decodedToken,
      expires_at_date: data.session.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
