import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';

import db from '@/lib/db';
import * as repositoryService from '@/lib/services/repositories';

// Helper to check if user has access to the provider
async function checkProviderAccess(id: string, userId: string) {
  const provider = await db.gitProvider.findUnique({
    where: { id },
  });

  if (!provider) {
    return { success: false, message: 'Provider not found', status: 404 };
  }

  if (provider.userId !== userId) {
    return { success: false, message: 'Not authorized to access this provider', status: 403 };
  }

  return { success: true, provider };
}

// GET /api/git-providers/[id]
export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const { params } = context;
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { success, provider, message, status } = await checkProviderAccess(
      params.id,
      session.user.id,
    );

    if (!success) {
      return NextResponse.json({ success, message }, { status: status });
    }

    return NextResponse.json(provider);
  } catch (error) {
    console.error('Error fetching git provider:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch git provider' },
      { status: 500 },
    );
  }
}

// DELETE /api/git-providers/[id]
export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    const { params } = context;
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { success, message, status } = await checkProviderAccess(params.id, session.user.id);

    if (!success) {
      return NextResponse.json({ success, message }, { status: status });
    }

    await repositoryService.deleteGitProvider(params.id);

    return NextResponse.json({ success: true, message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting git provider:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete git provider' },
      { status: 500 },
    );
  }
}
