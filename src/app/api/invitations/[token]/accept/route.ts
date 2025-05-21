import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { addTeamMember } from '@/app/actions/teamMemberAction';
import teamMemberDb from '@/lib/db/teamMemberDb';
import { getUser } from '@/lib/supabase/auth';

/**
 * POST /api/invitations/[token]/accept
 * Accepts a team invitation and adds the current user to the team
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Allow passing email in request body for newly created accounts
    // that might not have fully established session yet
    const body = await request.json().catch(() => ({}));

    // Get the current user
    const user = await getUser();
    if (!user && !body.email) {
      return NextResponse.json(
        { error: 'User not authenticated and no email provided' },
        { status: 401 },
      );
    }

    const cookieStore = cookies();

    // Get the invitation details
    const invitationResult = await teamMemberDb.getTeamInvitationByToken(token, cookieStore);

    if (!invitationResult.success || !invitationResult.data) {
      return NextResponse.json(
        { error: invitationResult.error || 'Invalid or expired invitation' },
        { status: 404 },
      );
    }

    const invitation = invitationResult.data;

    // Check if the user's email matches the invitation email
    const userEmail = user?.email || body.email;
    if (!userEmail || userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation is for a different email address' },
        { status: 403 },
      );
    }

    // Add the user to the team
    const addResult = await addTeamMember(invitation.team_id, userEmail, invitation.role);

    if (!addResult.success) {
      return NextResponse.json(
        { error: addResult.error || 'Failed to add user to team' },
        { status: 500 },
      );
    }

    // Update invitation status
    const updateResult = await teamMemberDb.updateInvitationStatus(token, 'accepted', cookieStore);

    return NextResponse.json({
      success: true,
      message: 'Successfully joined team',
    });
  } catch (error: any) {
    console.error('[@api:invitations:accept:POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 500 },
    );
  }
}
