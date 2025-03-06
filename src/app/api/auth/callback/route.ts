import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * This route handles OAuth callback requests from Supabase Auth.
 * It is needed for processing OAuth provider redirects.
 */
export async function GET(request: NextRequest) {
  // Fix the request URL if it's localhost in a GitHub Codespace
  let fixedUrl = request.url;
  
  // Check if we're in a GitHub Codespace and the URL contains localhost
  if (
    process.env.CODESPACE && 
    process.env.NEXT_PUBLIC_SITE_URL && 
    request.url.includes('localhost:')
  ) {
    // Replace localhost with the actual GitHub Codespace URL
    fixedUrl = request.url.replace(
      /https?:\/\/(localhost|127\.0\.0\.1):[0-9]+/,
      process.env.NEXT_PUBLIC_SITE_URL
    );
    console.log('Fixed request URL for GitHub Codespace:', fixedUrl);
  }
  
  const requestUrl = new URL(fixedUrl);
  const code = requestUrl.searchParams.get('code');
  
  // Get response to work with cookies
  const response = NextResponse.next();
  
  // Log information about the request for debugging
  console.log('Auth callback received:', {
    originalUrl: request.url,
    fixedUrl: fixedUrl,
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  console.log('Creating Supabase client with:', { 
    url: supabaseUrl,
    keyFirstChars: supabaseKey.substring(0, 10) + '...'
  });
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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
    // Use the fixed URL throughout instead of the original request.url
    console.log('Supabase environment:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      originalUrl: request.url,
      fixedUrl: fixedUrl
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
      
      // Get the origin URL for request headers
      const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      
      // Try another approach with direct fetch to debug
      try {
        // Add detailed logging for all relevant parameters
        console.log('Attempting direct token exchange with:', {
          tokenEndpoint,
          codeLength: code?.length,
          origin,
          apiKeyAvailable: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          isCodespace: !!process.env.CODESPACE,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL
        });
        
        // Create a more detailed request with full set of headers
        const tokenUrl = `${tokenEndpoint}?grant_type=authorization_code&code=${code}`;
        console.log('Full token URL:', tokenUrl);
        
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
            'Origin': origin,
            'Referer': origin,
            'X-Client-Info': 'supabase-js/2.31.0',
            'X-Auth-Token': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Accept': 'application/json'
          },
        });
        
        if (tokenResponse.ok) {
          console.log('Manual token exchange was successful!');
          const tokenData = await tokenResponse.json();
          console.log('Token data received:', {
            hasSession: !!tokenData.session,
            hasUser: !!tokenData.user,
            expiresIn: tokenData.expires_in
          });
        } else {
          console.log('Manual token exchange response:', {
            status: tokenResponse.status,
            ok: tokenResponse.ok,
            statusText: tokenResponse.statusText,
            headers: Object.fromEntries([...tokenResponse.headers.entries()])
          });
          try {
            const errorText = await tokenResponse.text();
            console.log('Error response text:', errorText.substring(0, 500));
            
            // Try to parse as JSON if possible
            try {
              const errorJson = JSON.parse(errorText);
              console.log('Error JSON:', errorJson);
            } catch (e) {
              // Not valid JSON
            }
          } catch (e) {
            console.log('Could not read error response');
          }
        }
      } catch (directFetchError) {
        console.error('Error with direct token fetch:', directFetchError);
      }
      
      // Try to exchange the code using Supabase client
      console.log('Trying exchange with Supabase client...');
      
      // Fix headers to match the expected domain
      if (process.env.CODESPACE && process.env.NEXT_PUBLIC_SITE_URL) {
        // This is important for GitHub Codespaces environment
        console.log('Running in GitHub Codespace, fixing request headers');
        const siteUrlHost = process.env.NEXT_PUBLIC_SITE_URL.replace('https://', '');
        
        // Set headers to match the expected domain
        request.headers.set('host', siteUrlHost);
        request.headers.set('origin', process.env.NEXT_PUBLIC_SITE_URL);
        request.headers.set('referer', process.env.NEXT_PUBLIC_SITE_URL);
        
        // Create a modified request with fixed URL for exchangeCodeForSession
        const modifiedRequest = new Request(fixedUrl, {
          headers: request.headers,
          method: request.method,
          body: request.body,
          cache: request.cache,
          credentials: request.credentials,
          integrity: request.integrity,
          keepalive: request.keepalive,
          mode: request.mode,
          redirect: request.redirect,
          referrer: process.env.NEXT_PUBLIC_SITE_URL,
          referrerPolicy: request.referrerPolicy,
          signal: request.signal,
        });
        
        // Use this modified request with exchangeCodeForSession
        request = modifiedRequest;
      }
      
      let error, data;
      try {
        // Exchange the code using the Supabase client
        console.log('Using Supabase client to exchange code with length:', code?.length);
        
        // Get the cookies before exchange attempt
        const cookiesBefore = request.cookies.getAll().map(c => ({ 
          name: c.name, 
          value: c.name.includes('token') ? '***' : c.value.substring(0, 10) + '...' 
        }));
        console.log('Cookies before exchange:', cookiesBefore);
        
        // Attempt the exchange
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
        data = result.data;
        
        // Log detailed result information
        console.log('Exchange code result:', { 
          hasError: !!error,
          errorMessage: error?.message,
          errorName: error?.name,
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : null,
          sessionExists: !!data?.session,
          userEmail: data?.session?.user?.email ? '***' : null
        });
        
        // Log all cookies after the exchange attempt
        const cookiesAfter = response.cookies.getAll().map(c => ({ 
          name: c.name, 
          value: c.name.includes('token') ? '***' : c.value.substring(0, 10) + '...' 
        }));
        console.log('Cookies after exchange:', cookiesAfter);
      } catch (exchangeError) {
        console.error('Exception during code exchange:', exchangeError);
        console.log('Exchange error details:', {
          name: exchangeError.name,
          message: exchangeError.message,
          stack: exchangeError.stack?.split('\n').slice(0, 3),
          originalError: exchangeError.originalError 
            ? { 
                name: exchangeError.originalError.name,
                message: exchangeError.originalError.message
              } 
            : null
        });
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
    } catch (error) {
      console.error('Error during token exchange process:', error);
      return NextResponse.redirect(new URL('/en/login?error=Token+exchange+failed', process.env.NEXT_PUBLIC_SITE_URL));
    }

    // Get session to verify success
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data.session;
    
    if (!session) {
      console.error('No session after code exchange');
      return NextResponse.redirect(new URL('/en/login?error=Authentication+failed', process.env.NEXT_PUBLIC_SITE_URL));
    }

    console.log('Successfully authenticated user:', {
      userId: session.user.id,
      email: session.user.email,
    });

    // Exchange the code successfully
    console.log('Exchanged code for session successfully!');
    console.log('User authenticated:', session.user.id);
    
    // Try to create user in database directly from this endpoint
    try {
      // Create a server-side fetch request to our create-user endpoint
      console.log('Creating user in database...');
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const createUserUrl = `${siteUrl}/api/auth/create-user`;
      
      const createUserResponse = await fetch(createUserUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token || ''}`
        },
        body: JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: session.user.user_metadata?.role || 'admin', // Default to admin role
          tenantId: 'trial',
          provider: session.user.app_metadata?.provider || 'github'
        })
      });
      
      if (createUserResponse.ok) {
        console.log('User created or verified in database during callback');
      } else {
        console.error('Failed to create user in database during callback:', 
          await createUserResponse.text());
      }
    } catch (createUserError) {
      console.error('Error creating user in database during callback:', createUserError);
      // Continue even if user creation fails here, we'll try again later
    }

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