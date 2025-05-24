import { NextResponse } from 'next/server';

/**
 * Check if OPENROUTER_API_KEY is available in environment variables
 */
export async function POST() {
  try {
    const hasKey = Boolean(process.env.OPENROUTER_API_KEY);

    return NextResponse.json({
      hasKey,
      message: hasKey ? 'Environment API key is available' : 'No environment API key found',
    });
  } catch (error) {
    console.error('[@api:check-openrouter-key] Error:', error);
    return NextResponse.json({ hasKey: false, error: 'Failed to check API key' }, { status: 500 });
  }
}
