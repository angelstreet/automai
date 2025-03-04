import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import db from '@/lib/db';

// GET /api/fetch-all-repositories
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Get all git providers for the user
      const providers = await db.gitProvider.findMany({
        where: { userId: session.user.id },
        select: { id: true },
      });

      // If no providers, return empty array with 200 status
      if (providers.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      // Fetch all repositories for all providers
      const repositories = await db.repository.findMany({
        where: {
          providerId: {
            in: providers.map((p) => p.id),
          },
        },
        include: {
          provider: true,
        },
      });

      return NextResponse.json(repositories);
    } catch (dbError) {
      // Handle any database errors
      console.log('Database error, returning empty array:', dbError);

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
