'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/shadcn/button';
import { usePermission } from '@/hooks/usePermission';
import { useTeam } from '@/hooks/useTeam';
import { TeamDetails } from '@/types/context/teamContextType';

export default function TeamActions() {
  const t = useTranslations('team');
  const { activeTeam } = useTeam('TeamActionsClient');
  const { hasPermission } = usePermission();

  // Treat activeTeam as TeamDetails
  const team = activeTeam as unknown as TeamDetails;

  // Show the create team button if no team is active
  if (!team) {
    return (
      <Button variant="default" size="sm">
        <PlusIcon className="h-4 w-4 mr-1" />
        {t('createTeam')}
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

  return (
    <div className="flex gap-2 items-center">
      <Button variant="outline" size="sm">
        <PlusIcon className="h-4 w-4 mr-1" />
        {t('addMember')}
      </Button>
    </div>
  );
}
