'use client';

import React, { useContext } from 'react';

import { TeamMemberDialogContext } from '@/context/TeamMemberDialogContext';

// Import the dialog components
import AddMemberDialog from './TeamMemberAddDialogClient';
import InviteMemberDialog from './TeamMemberInviteDialogClient';
import EditPermissionsDialog from './TeamMemberPermissionsDialogClient';

/**
 * TeamMemberDialogsClient - Renders the dialogs for team member management
 * This component relies on the TeamMemberDialogProvider to manage state
 * It should be included once at the app level where the dialogs are needed
 */
export default function TeamMemberDialogsClient() {
  // Safely try to access the dialog context
  const dialogContext = useContext(TeamMemberDialogContext);

  // If context is not available, don't render anything
  if (!dialogContext) {
    return null;
  }

  // Get dialog state from the provider
  const {
    teamId,
    addDialogOpen,
    setAddDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    inviteDialogOpen,
    setInviteDialogOpen,
    selectedMember,
    onMembersChanged,
  } = dialogContext;

  // Single handler for any operation that changes members
  const handleMembersChanged = () => {
    if (onMembersChanged) {
      onMembersChanged();
    }
  };

  return (
    <>
      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        teamId={teamId}
        onAddMember={handleMembersChanged}
      />

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        teamId={teamId}
      />

      {/* Edit Permissions Dialog */}
      {selectedMember && (
        <EditPermissionsDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          member={selectedMember}
          teamId={teamId}
          onSavePermissions={handleMembersChanged}
        />
      )}
    </>
  );
}
