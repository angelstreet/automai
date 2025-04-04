'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { usePermission } from '@/hooks/usePermission';
import { useTeam } from '@/hooks/useTeam';
import { TeamDetails } from '@/types/context/teamContextType';

import AddMemberDialog from './TeamMemberAddDialogClient';

export default function TeamActions() {
  const t = useTranslations('team');
  const { activeTeam } = useTeam('TeamActionsClient');

  // Local dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Treat activeTeam as TeamDetails
  const team = activeTeam as unknown as TeamDetails;

  // Show the create team button if no team is active
  if (!team) {
    return (
      <Button variant="default" size="sm">
        <PlusIcon className="h-4 w-4 mr-1" />
        {t('create_team')}
      </Button>
    );
  }

  // Use the centralized permission hook to check if user can manage team members
  const { canManageTeamMembers } = usePermission();
  const canAddMembers = canManageTeamMembers();

  // Don't show any buttons if user can't add members
  if (!canAddMembers) {
    return null;
  }

  // Handle dialog open/close
  const handleAddMemberClick = () => {
    setAddDialogOpen(true);
  };

  // Handle member added callback
  const handleMemberAdded = () => {
    // Refresh data or take other actions when a member is added
    // For example, we could trigger a team members refetch
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== 'members') {
      url.searchParams.set('tab', 'members');
      window.location.href = url.toString();
    } else {
      // If already on members tab, could dispatch a custom event to refresh the list
      window.dispatchEvent(new CustomEvent('refresh-team-members'));
    }
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="sm" onClick={handleAddMemberClick}>
          <PlusIcon className="h-4 w-4 mr-1" />
          {t('members_add_button')}
        </Button>
      </div>

      {/* Include the dialog directly in this component */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        teamId={team.id || null}
        onAddMember={handleMemberAdded}
      />
    </>
  );
}
