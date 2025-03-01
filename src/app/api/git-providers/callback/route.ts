import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { prisma } from '@/lib/prisma';
import * as repositoryService from '@/lib/services/repositories';
import { GitProviderType } from '@/types/repositories';

// GET /api/git-providers/callback
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
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
    const provider = await prisma.gitProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider || provider.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Provider not found or not authorized' },
        { status: 403 },
      );
    }

    // Get the appropriate provider service
    const providerService = repositoryService.getGitProviderService(provider.name as GitProviderType);

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