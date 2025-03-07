import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// GET /api/fetch-all-repositories
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      // Get all git providers for the user
      const { data: providers, error: providersError } = await supabase
        .from('git_providers')
        .select('id')
        .eq('userId', session.user.id);
      
      if (providersError) {
        console.error('Error fetching git providers:', providersError);
        return NextResponse.json([], { status: 200 });
      }

      // If no providers, return empty array with 200 status
      if (!providers || providers.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      // Fetch all repositories for all providers
      const { data: repositories, error: reposError } = await supabase
        .from('repositories')
        .select(`
          *,
          provider:git_providers(*)
        `)
        .in('providerId', providers.map(p => p.id));
      
      if (reposError) {
        console.error('Error fetching repositories:', reposError);
        return NextResponse.json([], { status: 200 });
      }

      return NextResponse.json(repositories || []);
    } catch (dbError) {
      // Handle any database errors
      console.log('Database error, returning empty array:', dbError);

      // For other database errors, log and return empty array
      console.error('Database error fetching repositories:', dbError);
      return NextResponse.json([], { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching all repositories:', error);
    // Return empty array instead of error for better UX
    return NextResponse.json([], { status: 200 });
  }
}
