import { NextRequest, NextResponse } from 'next/server';
import { syncRepository } from '@/app/[locale]/[tenant]/repositories/actions';

type Params = {
  params: {
    id: string;
  };
};

/**
 * POST /api/repositories/[id]/sync
 * Sync a repository with its provider
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 },
      );
    }

    // Call the server action to sync the repository
    const result = await syncRepository(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to sync repository' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in POST /api/repositories/[id]/sync:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
