import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';

import db from '@/lib/db';
import * as repositoryService from '@/lib/services/repositories';

// Helper to check if user has access to the repository
async function checkRepositoryAccess(id: string, userId: string) {
  const repository = await db.repository.findUnique({
    where: { id },
    include: {
      provider: true,
    },
  });

  if (!repository) {
    return { success: false, message: 'Repository not found', status: 404 };
  }

  if (repository.provider.userId !== userId) {
    return { success: false, message: 'Not authorized to access this repository', status: 403 };
  }

  return { success: true, repository };
}

// POST /api/repositories/sync/[id]
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { success, message, status } = await checkRepositoryAccess(params.id, session.user.id);

    if (!success) {
      return NextResponse.json({ success, message }, { status: status });
    }

    const repository = await repositoryService.syncRepository(params.id);

    return NextResponse.json(repository);
  } catch (error) {
    console.error('Error syncing repository:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to sync repository' },
      { status: 500 },
    );
  }
}
