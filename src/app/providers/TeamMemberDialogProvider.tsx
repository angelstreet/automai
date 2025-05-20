'use client';

import React, { useState, useContext, useCallback } from 'react';

import {
  TeamMemberDialogContext,
  TeamMemberDialogContextState,
} from '@/context/TeamMemberDialogContext';
import { TeamMemberResource } from '@/types/context/teamContextType';

interface TeamMemberDialogProviderProps {
  children: React.ReactNode;
  teamId: string | null;
  onMembersChanged?: () => void;
}

/**
 * TeamMemberDialogProvider - Pure data container for team member dialog state
 * No business logic, no data fetching, no side effects
 *
 * This provider manages the state for add/edit member dialogs
 */
export function TeamMemberDialogProvider({
  children,
  teamId,
  onMembersChanged,
}: TeamMemberDialogProviderProps) {
  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberResource | null>(null);

  // Memoized dialog control functions to prevent unnecessary re-renders
  const openAddDialog = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((member: TeamMemberResource) => {
    setSelectedMember(member);
    setEditDialogOpen(true);
  }, []);

  const openInviteDialog = useCallback(() => {
    setInviteDialogOpen(true);
  }, []);

  // Context value - contains only state and minimal functions
  const contextValue: TeamMemberDialogContextState = {
    // Dialog state values
    addDialogOpen,
    setAddDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    inviteDialogOpen,
    setInviteDialogOpen,
    selectedMember,

    // Dialog control functions
    openAddDialog,
    openEditDialog,
    openInviteDialog,

    // Callback function
    onMembersChanged,

    // Team ID
    teamId,
  };

  return (
    <TeamMemberDialogContext.Provider value={contextValue}>
      {children}
    </TeamMemberDialogContext.Provider>
  );
}

/**
 * Custom hook to use the TeamMemberDialogContext
 */
export function useTeamMemberDialog() {
  const context = useContext(TeamMemberDialogContext);

  if (!context) {
    throw new Error('useTeamMemberDialog must be used within a TeamMemberDialogProvider');
  }

  return context;
}
