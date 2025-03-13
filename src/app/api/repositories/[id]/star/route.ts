import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { starRepository } from '@/lib/supabase/db-repositories';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is properly awaited
    const repositoryId = params?.id;
    console.log('Star repository API route called for ID:', repositoryId);
    
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
      console.log('Profile not found, creating profile');
      // Create a profile for the user
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (createError || !newProfile) {
        return NextResponse.json(
          { success: false, error: 'Failed to create profile' },
          { status: 500 },
        );
      }
      
      profile = newProfile;
    }
    
    // Star the repository
    const result = await starRepository.starRepository(repositoryId, profile.id);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }
    
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error starring repository:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to star repository' },
      { status: 500 },
    );
  }
}
