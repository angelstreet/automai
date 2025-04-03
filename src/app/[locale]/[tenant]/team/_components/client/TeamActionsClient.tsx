'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/shadcn/button';
// Import the ResourceType from its actual type file
// Import the hook from hooks directory
import { usePermission, usePermissionWithSubscription } from '@/hooks/usePermission';
import { useTeam } from '@/hooks/useTeam';
import type { ResourceType } from '@/types/context/permissionsContextType';
import { TeamDetails } from '@/types/context/teamContextType';

export default function TeamActions() {
  const t = useTranslations('team');
  const { activeTeam } = useTeam('TeamActionsClient');

  // Use our combined hook that handles permissions with subscription tier
  const { canAddMembers } = usePermissionWithSubscription('TeamActionsClient');

  // Debug logging for action permissions
  console.log('== TEAM ACTIONS PERMISSION ==');
  console.log('Can add members:', canAddMembers());

  // Show the create team button if no team is active
  if (!activeTeam) {
    return (
      <Button variant="default" size="sm">
        <PlusIcon className="h-4 w-4 mr-1" />
        {t('createTeam')}
      </Button>
    );
  }

  // Don't show any buttons if user can't add members
  if (!canAddMembers()) {
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
