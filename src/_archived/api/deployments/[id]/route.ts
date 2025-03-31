// ARCHIVED: This API route was archived on 2025-03-31T12:57:53.915Z
// Original path: src/app/api/deployments/[id]/route.ts
// Route: /deployments/:id
// This file is preserved for reference purposes only and is no longer in use.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/app/actions/user';
import { checkPermission } from '@/lib/supabase/db-teams/permissions';
import { getDeploymentById, updateDeployment, deleteDeployment } from '@/app/actions/deployments';

/**
 * Example API route that demonstrates checking permissions before allowing resource operations
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Deployment ID is required' }, { status: 400 });
    }

    const deployment = await getDeploymentById(id);

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    return NextResponse.json(deployment);
  } catch (error) {
    console.error('Error in deployment API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = params.id;
    // Get deployment to check team_id and creator_id
    const deployment = await getDeploymentById(id);

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Check if user has permission to update this deployment
    const canUpdate = await checkPermission(
      user.id,
      deployment.tenantId, // Using tenantId as team_id based on the structure
      'deployments',
      'update',
      deployment.userId, // Using userId as creator_id
    );

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();

    // Update the deployment using the actions layer
    const updatedDeployment = await updateDeployment(id, body);

    if (!updatedDeployment) {
      return NextResponse.json({ error: 'Failed to update deployment' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedDeployment });
  } catch (error) {
    console.error('Error in deployment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = params.id;
    // Get deployment to check team_id and creator_id
    const deployment = await getDeploymentById(id);

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Check if user has permission to delete this deployment
    const canDelete = await checkPermission(
      user.id,
      deployment.tenantId, // Using tenantId as team_id
      'deployments',
      'delete',
      deployment.userId, // Using userId as creator_id
    );

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete the deployment using the actions layer
    const success = await deleteDeployment(id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete deployment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in deployment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
