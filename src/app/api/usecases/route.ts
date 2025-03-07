import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// Find the next available number for a prefix
async function findNextNumber(prefix: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: useCases, error } = await supabase
    .from('use_cases')
    .select('shortId')
    .like('shortId', `${prefix}-%`)
    .order('shortId', { ascending: false });
  
  if (error) {
    console.error('Error finding next number:', error);
    return 1;
  }
  
  if (useCases.length === 0) {
    return 1;
  }

  let highestNumber = 0;
  for (const useCase of useCases) {
    const parts = useCase.shortId.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > highestNumber) {
        highestNumber = num;
      }
    }
  }

  return highestNumber + 1;
}

// Generate a sequential short ID (e.g., WEB-1, WEB-2, etc.)
async function generateShortId(prefix: string) {
  const nextNumber = await findNextNumber(prefix);
  return `${prefix}-${nextNumber}`;
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get use cases with their related project and latest execution
    const { data: useCases, error } = await supabase
      .from('use_cases')
      .select(`
        *,
        project:projects(*),
        executions:executions(*)
      `)
      .eq('projectId', projectId)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching use cases:', error);
      return NextResponse.json({ error: 'Failed to fetch use cases' }, { status: 500 });
    }
    
    // Process the data to match the expected format
    const processedUseCases = useCases.map(useCase => {
      // Sort executions by createdAt and take the latest one
      const sortedExecutions = useCase.executions
        ? [...useCase.executions].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ).slice(0, 1)
        : [];
      
      return {
        ...useCase,
        executions: sortedExecutions
      };
    });

    return NextResponse.json(processedUseCases);
  } catch (error) {
    console.error('Error fetching use cases:', error);
    return NextResponse.json({ error: 'Failed to fetch use cases' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, projectId, steps, shortIdPrefix } = await request.json();

    if (!name || !projectId || !steps || !shortIdPrefix) {
      return NextResponse.json(
        { error: 'Name, projectId, steps, and shortIdPrefix are required' },
        { status: 400 },
      );
    }

    const shortId = await generateShortId(shortIdPrefix);

    // Create the use case
    const { data: useCase, error } = await supabase
      .from('use_cases')
      .insert({
        name,
        projectId,
        steps,
        shortId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select(`
        *,
        project:projects(*)
      `)
      .single();
    
    if (error) {
      console.error('Error creating use case:', error);
      return NextResponse.json({ error: 'Failed to create use case' }, { status: 500 });
    }

    return NextResponse.json(useCase, { status: 201 });
  } catch (error) {
    console.error('Error creating use case:', error);
    return NextResponse.json({ error: 'Failed to create use case' }, { status: 500 });
  }
}
