import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';

import { prisma } from '@/lib/prisma';

// GET /api/fetch-all-repositories
// Explicit naming for clear purpose: fetches ALL repositories across providers
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Get all git providers for the user
      const providers = await prisma.gitProvider.findMany({
        where: { userId: session.user.id },
        select: { id: true },
      });

      // If no providers, return empty array with 200 status
      if (providers.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      // Fetch all repositories for all providers
      const repositories = await prisma.repository.findMany({
        where: {
          providerId: {
            in: providers.map((p) => p.id),
          },
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
    } catch (dbError) {
      // Check if this is a PrismaClientKnownRequestError with code P2021 (table does not exist)
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        console.log('Repository table does not exist yet, returning empty array');
        return NextResponse.json([], { status: 200 });
      }

      // For other database errors, log and return empty array
      console.error('Database error fetching repositories:', dbError);
      return NextResponse.json([], { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching all repositories:', error);
    // Return empty array instead of error for better UX
    return NextResponse.json([], { status: 200 });
  }
}
