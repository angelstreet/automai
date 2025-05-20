'use client';

import { createContext } from 'react';

import { TeamMemberResource } from '@/types/context/teamContextType';

/**
 * Team Member Dialog context state interface
 * This is a minimal type definition for the context
 * No business logic belongs here, that goes in hooks
 */
export interface TeamMemberDialogContextState {
  // Dialog state values
  addDialogOpen: boolean;
  setAddDialogOpen: (isOpen: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (isOpen: boolean) => void;
  inviteDialogOpen: boolean;
  setInviteDialogOpen: (isOpen: boolean) => void;
  selectedMember: TeamMemberResource | null;

  // Dialog control functions
  openAddDialog: () => void;
  openEditDialog: (member: TeamMemberResource) => void;
  openInviteDialog: () => void;

  // Callback function
  onMembersChanged?: () => void;

  // Team ID
  teamId: string | null;
}

/**
 * Context definition with null default value
 * Used by TeamMemberDialogProvider in /app/providers/TeamMemberDialogProvider.tsx
 */
export const TeamMemberDialogContext = createContext<TeamMemberDialogContextState | null>(null);
