import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import * as repositoryService from '@/lib/services/repositories';
import { GitProviderType } from '@/types/repositories';

// Schema for provider creation
const GitProviderCreateSchema = z.object({
  name: z.enum(['github', 'gitlab', 'gitea'] as const),
  displayName: z.string().min(1, 'Display name is required'),
  serverUrl: z.string().url('Valid URL is required').optional(),
  token: z.string().optional(),
});

// GET /api/git-providers
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const providers = await repositoryService.listGitProviders(session.user.id);

    return NextResponse.json(providers);
  } catch (error) {
    console.error('Error fetching git providers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch git providers' },
      { status: 500 },
    );
  }
}

// POST /api/git-providers
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = GitProviderCreateSchema.parse(body);

    // For Gitea, we need serverUrl and token
    if (validatedData.name === 'gitea') {
      if (!validatedData.serverUrl || !validatedData.token) {
        return NextResponse.json(
          { success: false, message: 'Server URL and token are required for Gitea' },
          { status: 400 },
        );
      }

      // Create Gitea provider directly with token
      const provider = await repositoryService.createGitProvider(session.user.id, {
        name: validatedData.name,
        displayName: validatedData.displayName,
        accessToken: validatedData.token,
        serverUrl: validatedData.serverUrl,
      });

      return NextResponse.json(provider);
    }

    // For OAuth providers (GitHub, GitLab)
    const provider = await repositoryService.createGitProvider(session.user.id, {
      name: validatedData.name,
      displayName: validatedData.displayName,
    });

    // Generate OAuth URL
    const providerService = repositoryService.getGitProviderService(validatedData.name);
    const state = provider.id; // Use provider ID as state for callback
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/${validatedData.name}`;
    const authUrl = providerService.getAuthorizationUrl(redirectUri, state);

    return NextResponse.json({ ...provider, authUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 },
      );
    }

    console.error('Error creating git provider:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create git provider' },
      { status: 500 },
    );
  }
} 