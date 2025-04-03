'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/shadcn/button';
// Import the ResourceType from its actual type file
// Import the hook from hooks directory
import { usePermission } from '@/hooks/usePermission';
import { useTeam } from '@/hooks/useTeam';
import type { ResourceType } from '@/types/context/permissionsContextType';
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

  // Debug logging for action permissions
  console.log('== ACTION PERMISSION DEBUG ==');
  console.log('TeamActionsClient - subscription_tier:', team.subscription_tier);
  console.log('TeamActionsClient - subscription_tier type:', typeof team.subscription_tier);

  // Default to 'pro' if subscription_tier is undefined
  const effectiveSubscriptionTier = team.subscription_tier || 'pro';

  // Check if user has permission to add members with the effective tier
  const canAddMembersWithDefault =
    hasPermission('repositories' as ResourceType, 'insert') &&
    effectiveSubscriptionTier !== 'trial';

  console.log(
    'TeamActionsClient - hasPermission:',
    hasPermission('repositories' as ResourceType, 'insert'),
  );
  console.log('TeamActionsClient - canAddMembers with default:', canAddMembersWithDefault);
  console.log('TeamActionsClient - permission details:', {
    hasRepositoriesInsertPermission: hasPermission('repositories' as ResourceType, 'insert'),
    hasHostsInsertPermission: hasPermission('hosts' as ResourceType, 'insert'),
    isNotTrialTier: effectiveSubscriptionTier !== 'trial',
    subscription_tier: team.subscription_tier,
    effectiveSubscriptionTier,
    teamId: team.id,
  });

  console.log('== ACTION PERMISSION DEBUG BUTTON DISPLAY ==');
  console.log('Button should display:', canAddMembersWithDefault);
  console.log('Button details:', {
    hasRepositoriesInsertPermission: hasPermission('repositories' as ResourceType, 'insert'),
    subscriptionTier: team.subscription_tier,
    notTrial: effectiveSubscriptionTier !== 'trial',
    teamId: team.id,
  });

  // Don't show any buttons if user can't add members
  if (!canAddMembersWithDefault) {
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
