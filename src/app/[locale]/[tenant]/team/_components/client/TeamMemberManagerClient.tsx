'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { usePermission, useTeam, useTeamMember, TeamMemberResource, ResourceType } from '@/context';

import TeamMemberAddDialogClient from './TeamMemberAddDialogClient';
import TeamMemberPermissionsDialogClient from './TeamMemberPermissionsDialogClient';
import { MembersTab } from './TeamMembersTabClient';

interface TeamMemberManagerProps {
  teamId: string | null;
  subscriptionTier?: string;
}

export default function TeamMemberManager({
  teamId,
  subscriptionTier = 'trial',
}: TeamMemberManagerProps) {
  const t = useTranslations('team');
  const { hasPermission } = usePermission();
  const { activeTeam, invalidateTeamCache } = useTeam('TeamMemberManagerClient');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberResource | null>(null);

  // Check permissions for managing members
  const canManageMembers =
    hasPermission('repositories' as ResourceType, 'insert') && subscriptionTier !== 'trial';

  // Use our team member hook
  const { addMember, updatePermissions, isLoading } = useTeamMember({
    teamId,
    onSuccess: () => {
      // Invalidate any caches
      if (teamId) {
        invalidateTeamCache(teamId);
      }
    },
  });

  // Handle adding a new member
  const handleAddMember = async (email: string, role: string) => {
    const success = await addMember(email, role);
    if (success) {
      setAddDialogOpen(false);
    }
  };

  // Handle updating permissions
  const handleUpdatePermissions = async (member: TeamMemberResource, permissions: any) => {
    const success = await updatePermissions(member.profile_id, permissions);
    if (success) {
      setEditDialogOpen(false);
    }
  };

  // Open edit dialog for a member
  const openEditPermissions = (member: TeamMemberResource) => {
    setSelectedMember(member);
    setEditDialogOpen(true);
  };

  return (
    <div>
      {/* Header with add button */}
      {canManageMembers && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setAddDialogOpen(true)} disabled={!teamId}>
            <Plus className="mr-2 h-4 w-4" />
            {t('membersTab.add')}
          </Button>
        </div>
      )}

      {/* Members Tab */}
      <MembersTab
        teamId={teamId}
        userRole={activeTeam?.role}
        subscriptionTier={subscriptionTier}
        onEditMember={openEditPermissions}
      />

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        teamId={teamId}
        onAddMember={handleAddMember}
      />

      {/* Edit Permissions Dialog */}
      {selectedMember && (
        <EditPermissionsDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          member={selectedMember}
          teamId={teamId}
          onSavePermissions={handleUpdatePermissions}
        />
      )}
    </div>
  );
}
