import { NextRequest, NextResponse } from 'next/server';
import { syncRepository } from '@/app/actions/repositories';

type Props = {
  params: { id: string };
};

/**
 * POST /api/repositories/sync/[id]
 * Sync a repository by ID
 */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;

    // Call the server action to sync repository
    const result = await syncRepository(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to sync repository' },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in POST /api/repositories/sync/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
