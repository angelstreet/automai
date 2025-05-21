import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { getTeamById } from '@/lib/db/teamDb';
import { getTeamInvitationByToken } from '@/lib/db/teamMemberDb';

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

    const cookieStore = await cookies();
    const result = await getTeamInvitationByToken(token, cookieStore);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Invalid or expired invitation' },
        { status: 404 },
      );
    }

    // Get the team details to include team name
    const teamId = result.data.team_id;
    const teamResult = await getTeamById(teamId, cookieStore);

    // Add team name to the response
    const responseData = {
      ...result.data,
      team_name: teamResult.success ? teamResult.data?.name : 'Unknown Team',
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`[@api:invitations/token:GET] Error retrieving invitation:`, error);
    return NextResponse.json({ error: 'Failed to retrieve invitation' }, { status: 500 });
  }
}
