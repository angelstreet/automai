import { NextResponse } from 'next/server';
import { getRepositories } from '@/app/actions/repositories';

// GET /api/fetch-all-repositories
export async function GET(request: Request) {
  try {
    // Call the server action to get all repositories
    const result = await getRepositories();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch repositories' },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/fetch-all-repositories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
