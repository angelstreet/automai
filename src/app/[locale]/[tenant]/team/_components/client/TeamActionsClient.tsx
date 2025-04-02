'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/shadcn/button';
// Import the ResourceType from its actual type file
import type { ResourceType } from '@/types/context/permissionsContextType';
// Import the hook from hooks directory
import { usePermission } from '@/hooks';
import { useTeam } from '@/hooks/team';
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

  // Check if user has permission to add members
  const canAddMembers =
    hasPermission('repositories' as ResourceType, 'insert') && team.subscription_tier !== 'trial';

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
