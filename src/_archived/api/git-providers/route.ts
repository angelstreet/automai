// ARCHIVED: This API route was archived on 2025-03-31T09:42:38.759Z
// Original path: src/app/api/git-providers/route.ts
// Route: /git-providers
// This file is preserved for reference purposes only and is no longer in use.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createGitProvider, getGitProviders } from '@/app/actions/repositories';

// Schema validation for creating a git provider
const GitProviderCreateSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea']),
  displayName: z.string().min(2),
  serverUrl: z.string().url().optional(),
  token: z.string().optional(),
});

/**
 * GET /api/git-providers
 * Get all git providers for the current user
 */
export async function GET() {
  try {
    // Call the server action to get git providers
    const result = await getGitProviders();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch git providers' },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/git-providers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/git-providers
 * Create a new git provider
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Call the server action to create git provider
    const result = await createGitProvider(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create git provider' },
        { status: 400 },
      );
    }

    // If authUrl is provided, return it along with the provider data
    if (result.authUrl) {
      return NextResponse.json({
        id: result.data.id,
        authUrl: result.authUrl,
      });
    }

    // Otherwise, just return the provider data
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/git-providers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
