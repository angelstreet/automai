import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { testConnectionSchema } from './schema';

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // If Supabase client is null, fall back to a simple check
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication not available',
        },
        { status: 401 },
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 },
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const validatedData = testConnectionSchema.parse(body);

    // 3. Test connection with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const baseUrl =
      validatedData.type === 'gitea'
        ? validatedData.serverUrl
        : validatedData.type === 'github'
          ? 'https://api.github.com'
          : 'https://gitlab.com/api/v4';

    const response = await fetch(`${baseUrl}/api/v1/user`, {
      headers: {
        Authorization: `token ${validatedData.token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 4. Handle response
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection to git provider failed',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connection test successful',
    });
  } catch (error) {
    // 5. Error handling
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.name === 'AbortError' ? 'Connection timeout after 5s' : error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Connection to git provider failed',
      },
      { status: 500 },
    );
  }
}
