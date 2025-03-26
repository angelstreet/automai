import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Handle CORS for authentication
export async function OPTIONS(request: NextRequest) {
  // Set CORS headers for preflight request
  const origin = request.headers.get('origin') || '';
  
  console.log('CORS Auth: Handling OPTIONS request from origin:', origin);
  
  // Allow the actual origin that made the request, regardless of what it is
  // This helps both with Cloudworkstations and Vercel deployments
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, X-Supabase-Client',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
  
  return new NextResponse(null, { status: 204, headers });
}

// Proxy authentication to Supabase
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin') || '';
    
    console.log('CORS Auth: Handling POST request from origin:', origin);
    
    // Create Supabase client with custom fetch implementation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          fetch: (url, options = {}) => {
            // Add custom headers to all Supabase requests
            const customHeaders = {
              ...options.headers,
              'X-Client-Info': 'supabase-js/2.x',
            };
            
            return fetch(url, {
              ...options,
              headers: customHeaders,
            });
          }
        }
      }
    );
    
    // Get request body with email and password
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('CORS Auth: Authentication error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    // Set appropriate CORS headers
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, X-Supabase-Client',
    };
    
    // Return the session data
    return NextResponse.json({ data }, { headers });
  } catch (error: any) {
    console.error('CORS Auth: Unexpected error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}