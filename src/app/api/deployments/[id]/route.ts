import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { checkPermission } from '@/lib/supabase/db-teams/permissions';
import { getUserActiveTeam } from '@/lib/supabase/db-teams/teams';
import { supabase } from '@/lib/supabase/browser-client';

/**
 * Example API route that demonstrates checking permissions before allowing resource operations
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get active team
    const teamResult = await getUserActiveTeam(user.id);
    if (!teamResult.success || !teamResult.data) {
      return NextResponse.json({ error: 'Failed to get active team' }, { status: 400 });
    }

    // Check if user has permission to view deployments
    const canSelect = await checkPermission(user.id, teamResult.data.id, 'deployments', 'select');

    if (!canSelect) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Fetch the deployment
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', params.id)
      .eq('team_id', teamResult.data.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in deployment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get deployment to check team_id and creator_id
    const { data: deployment, error: fetchError } = await supabase
      .from('deployments')
      .select('team_id, creator_id')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Check if user has permission to update this deployment
    const canUpdate = await checkPermission(
      user.id,
      deployment.team_id,
      'deployments',
      'update',
      deployment.creator_id,
    );

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();

    // Update the deployment
    const { data, error } = await supabase
      .from('deployments')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in deployment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get deployment to check team_id and creator_id
    const { data: deployment, error: fetchError } = await supabase
      .from('deployments')
      .select('team_id, creator_id')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Check if user has permission to delete this deployment
    const canDelete = await checkPermission(
      user.id,
      deployment.team_id,
      'deployments',
      'delete',
      deployment.creator_id,
    );

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete the deployment
    const { error } = await supabase.from('deployments').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in deployment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
