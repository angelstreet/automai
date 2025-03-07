import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

import * as repositoryService from '@/lib/services/repositories';
import { GitProviderType } from '@/types/repositories';

// GET /api/git-providers/callback
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 401 }
      );
    }

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Parse the state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch (e) {
      return NextResponse.json(
        { success: false, message: 'Invalid state parameter' },
        { status: 400 },
      );
    }

    const { providerId, redirectUri } = stateData;

    // Get the provider
    const { data: provider, error: providerError } = await supabase
      .from('git_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (providerError || !provider || provider.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Provider not found or not authorized' },
        { status: 403 },
      );
    }

    // Get the appropriate provider service
    const providerService = await repositoryService.getGitProviderService(
      provider.name as GitProviderType,
    );

    // Exchange the code for an access token
    const tokenData = await providerService.exchangeCodeForToken(code, redirectUri);

    // Update the provider with the token data
    const updatedProvider = await repositoryService.updateGitProvider(providerId, tokenData);

    // Redirect to the repositories page
    return NextResponse.redirect(new URL(`/repositories?provider=${providerId}`, request.url));
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process OAuth callback' },
      { status: 500 },
    );
  }
}
