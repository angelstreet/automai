'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { TeamMemberResource } from '@/types/context/team';

// Import the components with their actual names
import AddMemberDialog from './TeamMemberAddDialogClient';
import EditPermissionsDialog from './TeamMemberPermissionsDialogClient';

interface MemberDialogControllerProps {
  teamId: string | null;
  onMembersChanged?: () => void;
}

export function MemberDialogController({ teamId, onMembersChanged }: MemberDialogControllerProps) {
  const t = useTranslations('team');

  // State for Add Member dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // State for Edit Permissions dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberResource | null>(null);

  // Open the add member dialog
  const openAddDialog = () => {
    setAddDialogOpen(true);
  };

  // Open the edit permissions dialog for a specific member
  const openEditDialog = (member: TeamMemberResource) => {
    setSelectedMember(member);
    setEditDialogOpen(true);
  };

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
        onAddMember={async (email, role) => {
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

// Create a React Context to access dialog controller methods throughout the app
export const MemberDialogContext = React.createContext<{
  openAddDialog: () => void;
  openEditDialog: (member: TeamMemberResource) => void;
} | null>(null);

export function MemberDialogProvider({
  children,
  teamId,
  onMembersChanged,
}: MemberDialogControllerProps & { children: React.ReactNode }) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberResource | null>(null);

  // Open the add member dialog
  const openAddDialog = () => {
    setAddDialogOpen(true);
  };

  // Open the edit permissions dialog for a specific member
  const openEditDialog = (member: TeamMemberResource) => {
    setSelectedMember(member);
    setEditDialogOpen(true);
  };

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
    <MemberDialogContext.Provider value={{ openAddDialog, openEditDialog }}>
      {children}

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        teamId={teamId}
        onAddMember={async (email, role) => {
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
    </MemberDialogContext.Provider>
  );
}

// Custom hook to use the MemberDialogContext
export function useMemberDialog() {
  const context = React.useContext(MemberDialogContext);
  if (!context) {
    throw new Error('useMemberDialog must be used within a MemberDialogProvider');
  }
  return context;
}
