'use client';

import React from 'react';

import { useTeamMemberDialog } from '@/app/providers/TeamMemberDialogProvider';
import { TeamMemberResource } from '@/types/context/teamContextType';

// Import the dialog components
import AddMemberDialog from './TeamMemberAddDialogClient';
import EditPermissionsDialog from './TeamMemberPermissionsDialogClient';

/**
 * TeamMemberDialogsClient - Renders the dialogs for team member management
 * This component relies on the TeamMemberDialogProvider to manage state
 * It should be included once at the app level where the dialogs are needed
 */
export default function TeamMemberDialogsClient() {
  // Get dialog state from the provider
  const {
    teamId,
    addDialogOpen,
    setAddDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    selectedMember,
    onMembersChanged,
  } = useTeamMemberDialog();
  
  // Debug dialog state
  console.log('== DIALOG DEBUG ==');
  console.log('TeamMemberDialogsClient - dialog state:', {
    teamId,
    addDialogOpen,
    editDialogOpen,
    hasSelectedMember: !!selectedMember,
  });

  // Handle when a member is added
  const handleMemberAdded = async () => {
    // Trigger the callback to refresh the members list
    if (onMembersChanged) {
      onMembersChanged();
    }
  };

  // Handle when permissions are saved
  const handlePermissionsSaved = async () => {
    // Trigger the callback to refresh the members list
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
        onAddMember={async (_email, _role) => {
          await handleMemberAdded();
        }}
      />

      {/* Edit Permissions Dialog */}
      {selectedMember && (
        <EditPermissionsDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          member={selectedMember}
          teamId={teamId}
          onSavePermissions={async () => {
            await handlePermissionsSaved();
          }}
        />
      )}
    </>
  );
}
