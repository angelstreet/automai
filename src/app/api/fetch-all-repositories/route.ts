import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { prisma } from '@/lib/prisma';
import * as repositoryService from '@/lib/services/repositories';

// GET /api/fetch-all-repositories
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get all git providers for the user
    const providers = await prisma.gitProvider.findMany({
      where: { userId: session.user.id },
      select: { id: true }
    });

    // If no providers, return empty array with 200 status
    if (providers.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Fetch all repositories for all providers
    const repositories = await prisma.repository.findMany({
      where: {
        providerId: {
          in: providers.map(p => p.id)
        }
      },
      include: {
        provider: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(repositories);
  } catch (error) {
    console.error('Error fetching all repositories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch repositories' },
      { status: 500 },
    );
  }
} 