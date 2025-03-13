import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { starRepository } from '@/lib/supabase/db-repositories';

export async function GET() {
  console.log('Starred repositories API route called');
  try {
    // Get the current user's profile ID
    const supabase = await createClient();
    
    console.log('Supabase client created');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('User retrieved:', user ? 'Yes' : 'No', 'Error:', userError ? 'Yes' : 'No');
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
    
    // Get the profile ID for the current user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    console.log('Profile retrieved:', profile ? 'Yes' : 'No', 'Error:', profileError ? 'Yes' : 'No');
    
    if (profileError || !profile) {
      console.log('Profile not found, returning empty array');
      // Return empty array instead of error for better UX
      return NextResponse.json({ success: true, data: [] });
    }
    
    // Use the DB layer module to get starred repositories
    const result = await starRepository.getStarredRepositories(profile.id);
    
    console.log('Starred repositories retrieved:', result.success, 'Data:', result.data ? `${result.data.length} repos` : 'No');
    
    return NextResponse.json({ 
      success: result.success, 
      data: result.data || [],
      error: result.error
    });
  } catch (error: any) {
    console.error('Error fetching starred repositories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch starred repositories' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  console.log('POST to starred repositories API route called');
  try {
    const { repositoryId } = await request.json();
    
    if (!repositoryId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 },
      );
    }
    
    console.log('Repository ID to star:', repositoryId);
    
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
      console.log('Profile not found in POST, creating profile');
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
      
      // Use the newly created profile
      profile = newProfile;
    }
    
    // Use the DB layer module to star the repository
    const result = await starRepository.starRepository(repositoryId, profile.id);
    
    return NextResponse.json({ 
      success: result.success, 
      data: result.data,
      error: result.error
    });
  } catch (error: any) {
    console.error('Error starring repository:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to star repository' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  console.log('DELETE from starred repositories API route called');
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    
    if (!repositoryId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 },
      );
    }
    
    console.log('Repository ID to unstar:', repositoryId);
    
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
