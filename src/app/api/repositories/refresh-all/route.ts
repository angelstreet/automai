import { NextRequest, NextResponse } from 'next/server';
import { getRepositories } from '@/app/[locale]/[tenant]/repositories/actions';
import { getUser } from '@/app/actions/user';
import { repository } from '@/lib/supabase';

/**
 * POST /api/repositories/refresh-all
 * Refresh all repositories for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // First, fetch all repositories to know which ones to refresh
    const reposResult = await getRepositories();

    if (!reposResult.success || !reposResult.data) {
      return NextResponse.json(
        { success: false, error: reposResult.error || 'Failed to fetch repositories' },
        { status: 400 },
      );
    }

    // Update timestamps for all repositories
    // In a real implementation, this would also sync with the git providers
    const updatePromises = reposResult.data.map(async (repo) => {
      try {
        await repository.updateSyncTimestamp(repo.id, user.id);
        return { id: repo.id, success: true };
      } catch (error) {
        console.error(`Error updating repository ${repo.id}:`, error);
        return { id: repo.id, success: false };
      }
    });

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);

    // Check if any failed
    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Updated ${results.length - failures.length} of ${results.length} repositories`,
        partialFailure: true,
        failedIds: failures.map((f) => f.id),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully refreshed all ${results.length} repositories`,
    });
  } catch (error) {
    console.error('Error in POST /api/repositories/refresh-all:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
