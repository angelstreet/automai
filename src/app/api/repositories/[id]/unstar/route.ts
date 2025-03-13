import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { starRepository } from '@/lib/supabase/db-repositories';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('Unstar repository API route called for ID:', params.id);
  try {
    const repositoryId = params.id;
    
    if (!repositoryId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 },
      );
    }
    
    // Get the current user's profile ID
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
    
    // Get the profile ID for the current user
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      // If no profile exists, there's nothing to unstar
      return NextResponse.json({ 
        success: true, 
        message: 'No profile found, nothing to unstar' 
      });
    }
    
    // Use the DB layer module to unstar the repository
    const result = await starRepository.unstarRepository(repositoryId, profile.id);
    
    return NextResponse.json({ 
      success: result.success, 
      data: result.data,
      error: result.error
    });
  } catch (error: any) {
    console.error('Error unstarring repository:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to unstar repository' },
      { status: 500 },
    );
  }
}
