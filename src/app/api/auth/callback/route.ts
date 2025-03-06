import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * This route handles OAuth callback requests from Supabase Auth.
 * It is needed for processing OAuth provider redirects.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // Get response to work with cookies
  const response = NextResponse.next();
  
  // Log information about the request for debugging
  console.log('Auth callback received:', {
    url: request.url,
    hasCode: !!code,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      SUPABASE_AUTH_CALLBACK_URL: process.env.SUPABASE_AUTH_CALLBACK_URL
    }
  });

  // If there's no code, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/en/login', process.env.NEXT_PUBLIC_SITE_URL || request.url));
  }

  // Create a Supabase client for handling the callback
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          return request.cookies.get(name)?.value;
        },
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  try {
    // Debug information about URL and environment
    console.log('Supabase environment:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      originalUrl: request.url,
      normalizedUrl: request.url.replace('localhost:3000', process.env.NEXT_PUBLIC_SITE_URL?.replace('https://', ''))
    });

    // Test Supabase connection before exchanging the code
    try {
      console.log('Testing Supabase connection...');
      // Test the health endpoint first
      const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        }
      });
      console.log('Supabase health response:', {
        status: healthResponse.status,
        ok: healthResponse.ok,
        statusText: healthResponse.statusText
      });
      
      // Test the auth endpoint
      const authResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        }
      });
      console.log('Supabase auth endpoint response:', {
        status: authResponse.status,
        ok: authResponse.ok,
        statusText: authResponse.statusText
      });
      
      // Full test of the complete auth/token endpoint
      const pingResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'test' }),
      });
      
      const responseText = await pingResponse.text();
      console.log('Supabase auth token response:', {
        status: pingResponse.status,
        ok: pingResponse.ok,
        statusText: pingResponse.statusText,
        response: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
      });
    } catch (pingError) {
      console.error('Supabase ping error:', pingError);
    }

    // Exchange the code for a session - with better error handling
    console.log('Exchanging code for session...');
    try {
      // First verify we can access the token endpoint directly
      const tokenEndpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token`;
      console.log(`Testing token endpoint: ${tokenEndpoint}`);
      
      // Try another approach with direct fetch to debug
      try {
        const tokenResponse = await fetch(`${tokenEndpoint}?grant_type=authorization_code&code=${code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        });
        
        if (tokenResponse.ok) {
          console.log('Manual token exchange was successful!');
        } else {
          console.log('Manual token exchange response:', {
            status: tokenResponse.status,
            ok: tokenResponse.ok,
            statusText: tokenResponse.statusText
          });
          try {
            const errorText = await tokenResponse.text();
            console.log('Error response text:', errorText);
          } catch (e) {
            console.log('Could not read error response');
          }
        }
      } catch (directFetchError) {
        console.error('Error with direct token fetch:', directFetchError);
      }
      
      // Try to exchange the code using Supabase client
      console.log('Trying exchange with Supabase client...');
      let error, data;
      try {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
        data = result.data;
        
        console.log('Exchange code result:', { 
          hasError: !!error,
          hasData: !!data,
          sessionExists: !!data?.session
        });
      } catch (exchangeError) {
        console.error('Exception during code exchange:', exchangeError);
        return NextResponse.redirect(new URL(`/en/login?error=${encodeURIComponent('Error during code exchange')}`, process.env.NEXT_PUBLIC_SITE_URL));
      }
    
      if (error) {
        console.error('Error exchanging code for session:', error);
        console.log('Error details:', {
          message: error.message,
          name: error.name,
          status: (error as any).status,
          originalError: (error as any).originalError
        });
        return NextResponse.redirect(new URL(`/en/login?error=${encodeURIComponent(error.message)}`, process.env.NEXT_PUBLIC_SITE_URL));
      }
    }

    // Get session to verify success
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No session after code exchange');
      return NextResponse.redirect(new URL('/en/login?error=Authentication+failed', process.env.NEXT_PUBLIC_SITE_URL));
    }

    console.log('Successfully authenticated user:', {
      userId: session.user.id,
      email: session.user.email,
    });

    // Always redirect to the auth-redirect page with 'en' locale as fallback
    return NextResponse.redirect(new URL('/en/auth-redirect', process.env.NEXT_PUBLIC_SITE_URL));
  } catch (error) {
    console.error('Exception during auth callback:', error);
    console.log('Detailed error:', {
      error,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
    });
    return NextResponse.redirect(new URL('/en/login?error=Server+error', process.env.NEXT_PUBLIC_SITE_URL));
  }
}
