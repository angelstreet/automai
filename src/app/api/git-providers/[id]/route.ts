import { NextRequest, NextResponse } from 'next/server';
import { getGitProvider, deleteGitProvider } from '@/app/actions/git-providers';

type Props = {
  params: { id: string };
};

/**
 * GET /api/git-providers/[id]
 * Get a git provider by ID
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;

    // Call the server action to get git provider
    const result = await getGitProvider(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch git provider' },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/git-providers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/git-providers/[id]
 * Delete a git provider by ID
 */
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;

    // Call the server action to delete git provider
    const result = await deleteGitProvider(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete git provider' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, message: 'Git provider deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/git-providers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
