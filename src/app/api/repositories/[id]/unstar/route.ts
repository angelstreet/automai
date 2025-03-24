import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { starRepository } from '@/lib/supabase/db-repositories';
import { getUser } from '@/app/actions/user';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // Ensure params is properly awaited
    const repositoryId = params?.id;
    console.log('Unstar repository API route called for ID:', repositoryId);

    if (!repositoryId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 },
      );
    }

    // Get the current user using the centralized getUser action
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client only for DB operations
    const supabase = await createClient();

    // Get the profile ID for the current user using user.id from the centralized context
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // If no profile exists, there's nothing to unstar
      return NextResponse.json({
        success: true,
        message: 'No profile found, nothing to unstar',
      });
    }

    // Use the DB layer module to unstar the repository
    const result = await starRepository.unstarRepository(repositoryId, profile.id);

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error) {
    console.error('Error unstarring repository:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unstar repository' },
      { status: 500 },
    );
  }
}
