import { NextRequest, NextResponse } from 'next/server';
import { handleAuthCallback } from '@/app/actions/user';

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
      // Replace the hostname and port with the site URL
      const url = new URL(request.url);
      const newUrl = new URL(url.pathname + url.search, siteUrl);
      fixedUrl = newUrl.toString();
    }
  }

  try {
    // Process the auth callback using our server action
    const result = await handleAuthCallback(fixedUrl);

    if (!result.success) {
      // If there was an error, redirect to login with error message
      const redirectUrl = new URL('/login', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', result.error || 'Authentication failed');
      return NextResponse.redirect(redirectUrl);
    }

    // If successful, redirect to the dashboard or specified redirect URL
    return NextResponse.redirect(new URL(result.redirectUrl || '/', request.nextUrl.origin));
  } catch (error) {
    console.error('Error in auth callback route:', error);

    // Handle errors and redirect to login with error message
    const redirectUrl = new URL('/login', request.nextUrl.origin);
    redirectUrl.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Authentication failed',
    );
    return NextResponse.redirect(redirectUrl);
  }
}
