import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import * as repositoryService from '@/lib/services/repositories';
import { GitProviderType } from '@/types/repositories';

// Schema for provider creation
const GitProviderCreateSchema = z.object({
  name: z.enum(['github', 'gitlab', 'gitea'] as const),
  displayName: z.string().min(1, 'Display name is required'),
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

    // Check if provider already exists for this user
    const existingProviders = await repositoryService.listGitProviders(session.user.id);
    const providerExists = existingProviders.some(
      (provider) => provider.name === validatedData.name
    );

    if (providerExists) {
      return NextResponse.json(
        { success: false, message: `A ${validatedData.name} provider already exists for this user` },
        { status: 400 },
      );
    }

    const provider = await repositoryService.createGitProvider(session.user.id, {
      name: validatedData.name as GitProviderType,
      displayName: validatedData.displayName,
    });

    return NextResponse.json(provider, { status: 201 });
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