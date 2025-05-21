import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import teamMemberDb from '@/lib/db/teamMemberDb';

/**
 * GET /api/invitations/[token]
 * Retrieves the details of a team invitation by token
 */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const result = await teamMemberDb.getTeamInvitationByToken(token, cookieStore);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Invalid or expired invitation' },
        { status: 404 },
      );
    }

    // Return the invitation details
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[@api:invitations:GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get invitation' },
      { status: 500 },
    );
  }
}
