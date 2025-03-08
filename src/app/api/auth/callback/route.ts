import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Add this interface at the top of the file
interface SupabaseError extends Error {
  status?: number;
  originalError?: {
    name: string;
    message: string;
  };
}

/**
 * This route handles OAuth callback requests from Supabase Auth.
 * It is needed for processing OAuth provider redirects.
 */
export async function GET(request: NextRequest) {
  // Fix the request URL if it's localhost in a GitHub Codespace
  let fixedUrl = request.url;

  // Check if we're in a GitHub Codespace or if URL needs to be fixed for any environment
  if (request.url.includes('localhost:') || request.url.includes('127.0.0.1:')) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (siteUrl) {
      // Replace localhost with the actual site URL (Codespace URL or production URL)
      fixedUrl = request.url.replace(
        /https?:\/\/(localhost|127\.0\.0\.1):[0-9]+/,
        siteUrl,
      );
      console.log('Fixed request URL for callback:', fixedUrl);
    } else {
      console.warn('No NEXT_PUBLIC_SITE_URL provided for URL replacement');
    }
  }
  
  // If we're in a GitHub Codespace and the URL contains the Codespace domain
  if (
    process.env.CODESPACE &&
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN &&
    request.url.includes(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN)
  ) {
    console.log('Detected Codespace URL in callback:', request.url);
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
      SUPABASE_AUTH_CALLBACK_URL: process.env.SUPABASE_AUTH_CALLBACK_URL,
    },
  });

  // If there's no code, redirect to login
  if (!code) {
    return NextResponse.redirect(
      new URL('/en/login', process.env.NEXT_PUBLIC_SITE_URL || request.url),
    );
  }

  // Create a custom cookieStore that works with the NextRequest/NextResponse objects
  const cookieStore = {
    getAll: () => request.cookies.getAll(),
    set: (name: string, value: string, options: any) => {
      response.cookies.set({ name, value, ...options });
    },
  };

  // Use our wrapper to create the Supabase client
  const supabase = await createServerClient();

  try {
    console.log('Supabase environment:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      originalUrl: request.url,
      fixedUrl: fixedUrl,
    });

    // Test Supabase connection before exchanging the code
    try {
      console.log('Testing Supabase connection...');
      // Test the health endpoint first
      const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });
      console.log('Supabase health response:', {
        status: healthResponse.status,
        ok: healthResponse.ok,
        statusText: healthResponse.statusText,
      });

      // Test the auth endpoint
      const authResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/`, {
        method: 'GET',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });
      console.log('Supabase auth endpoint response:', {
        status: authResponse.status,
        ok: authResponse.ok,
        statusText: authResponse.statusText,
      });

      // Full test of the complete auth/token endpoint
      const pingResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({ email: 'test@example.com', password: 'test' }),
        },
      );

      const responseText = await pingResponse.text();
      console.log('Supabase auth token response:', {
        status: pingResponse.status,
        ok: pingResponse.ok,
        statusText: pingResponse.statusText,
        response: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''),
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
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
        });

        // Create a more detailed request with full set of headers
        const tokenUrl = `${tokenEndpoint}?grant_type=authorization_code&code=${code}`;
        console.log('Full token URL:', tokenUrl);

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
            Origin: origin,
            Referer: origin,
            'X-Client-Info': 'supabase-js/2.31.0',
            'X-Auth-Token': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            Accept: 'application/json',
          },
        });

        if (tokenResponse.ok) {
          console.log('Manual token exchange was successful!');
          const tokenData = await tokenResponse.json();
          console.log('Token data received:', {
            hasSession: !!tokenData.session,
            hasUser: !!tokenData.user,
            expiresIn: tokenData.expires_in,
          });
        } else {
          console.log('Manual token exchange response:', {
            status: tokenResponse.status,
            ok: tokenResponse.ok,
            statusText: tokenResponse.statusText,
            headers: Object.fromEntries([...tokenResponse.headers.entries()]),
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
      }

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error exchanging code for session:', error);
        throw error;
      }

      if (!data.session) {
        console.error('No session returned from exchangeCodeForSession');
        throw new Error('No session returned from exchangeCodeForSession');
      }

      console.log('Successfully exchanged code for session');

      // Determine the redirect URL
      let redirectTo = '/en/auth-redirect';

      // Check if we have a locale in the URL
      const locale = requestUrl.pathname.split('/')[1];
      if (locale && ['en', 'fr'].includes(locale)) {
        redirectTo = `/${locale}/auth-redirect`;
      }

      // Add the site URL if available
      const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? new URL(redirectTo, process.env.NEXT_PUBLIC_SITE_URL)
        : new URL(redirectTo, request.url);

      console.log('Redirecting to:', redirectUrl.toString());

      // Redirect to the auth-redirect page which will handle the final redirect
      return NextResponse.redirect(redirectUrl);
    } catch (exchangeError) {
      console.error('Error in code exchange:', exchangeError);

      // Enhanced error handling
      let errorMessage = 'Authentication failed';
      let statusCode = 500;

      if (exchangeError instanceof Error) {
        const supabaseError = exchangeError as SupabaseError;
        errorMessage = supabaseError.message;

        // Check for specific error types
        if (supabaseError.status) {
          statusCode = supabaseError.status;
        }

        if (supabaseError.originalError) {
          console.error('Original error:', supabaseError.originalError);
        }
      }

      // Redirect to login with error
      const loginUrl = new URL(
        `/en/login?error=${encodeURIComponent(errorMessage)}`,
        process.env.NEXT_PUBLIC_SITE_URL || request.url,
      );

      console.log('Redirecting to login with error:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);

    // Redirect to login with generic error
    const loginUrl = new URL(
      `/en/login?error=${encodeURIComponent('Authentication failed')}`,
      process.env.NEXT_PUBLIC_SITE_URL || request.url,
    );

    return NextResponse.redirect(loginUrl);
  }
} 