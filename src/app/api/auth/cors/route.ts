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
    console.log('CORS Auth: Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('CORS Auth: Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('CORS Auth: Missing Supabase credentials!');
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }
    
    // Create Supabase client with error handling
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            fetch: async (url, options = {}) => {
              // Add custom headers to all Supabase requests
              console.log('CORS Auth: Supabase fetch request to:', url);
              
              const customHeaders = {
                ...options.headers,
                'X-Client-Info': 'supabase-js/2.x',
              };
              
              try {
                return await fetch(url, {
                  ...options,
                  headers: customHeaders,
                });
              } catch (fetchError) {
                console.error('CORS Auth: Fetch error in Supabase client:', fetchError);
                throw fetchError;
              }
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
      
      console.log('CORS Auth: Attempting authentication for:', email);
      
      try {
        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('CORS Auth: Authentication error:', error.message);
          return NextResponse.json({ error: error.message }, { status: 401 });
        }
        
        console.log('CORS Auth: Authentication successful!');
        
        // Set appropriate CORS headers
        const headers = {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, X-Supabase-Client',
        };
        
        // Return the session data
        return NextResponse.json({ data }, { headers });
      } catch (authError: any) {
        console.error('CORS Auth: Error during Supabase auth call:', authError);
        return NextResponse.json(
          { error: authError.message || 'Authentication failed' },
          { status: 500 }
        );
      }
    } catch (clientError: any) {
      console.error('CORS Auth: Error creating Supabase client:', clientError);
      return NextResponse.json(
        { error: clientError.message || 'Error creating authentication client' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('CORS Auth: Unexpected error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}