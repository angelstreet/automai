import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { starRepository } from '@/lib/supabase/db-repositories';
import { getUser } from '@/app/actions/user';

export async function GET() {
  console.log('Starred repositories API route called');
  try {
    // Get the current user using the centralized getUser action
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
    
    // Create Supabase client only for DB operations
    const supabase = await createClient();
    
    // Get the profile ID for the current user using user.id from the centralized context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
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
  } catch (error) {
    console.error('Error fetching starred repositories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch starred repositories' },
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
    
    // Get the current user using the centralized getUser action
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
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
      console.log('Profile not found in POST, returning empty array');
      // Return empty array instead of error for better UX
      return NextResponse.json({ success: true, data: [] });
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
    
    // Get the current user using the centralized getUser action
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
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
