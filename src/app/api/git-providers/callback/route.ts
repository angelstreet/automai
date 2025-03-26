import { NextRequest, NextResponse } from 'next/server';
import { handleOAuthCallback } from '@/app/actions/repositories';

/**
 * GET /api/git-providers/callback
 * Handle OAuth callback for git providers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json(
        { success: false, message: `OAuth error: ${error}` },
        { status: 400 },
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 },
      );
    }

    // Call the server action to handle the OAuth callback
    const result = await handleOAuthCallback(code, state);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to process OAuth callback' },
        { status: 400 },
      );
    }

    // Redirect to the repositories page
    if (result.redirectUrl) {
      return NextResponse.redirect(new URL(result.redirectUrl, request.url));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in GET /api/git-providers/callback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
