'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/shadcn/button';
// Import the ResourceType from its actual type file
// Import the hook from hooks directory
import { usePermission } from '@/hooks/usePermission';
import { useTeam } from '@/hooks/useTeam';
import { useContext } from 'react';
import { UserContext } from '@/context/UserContext';
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

  // Get user directly from context
  const { user } = useContext(UserContext);
  
  // Check if user has admin role
  const isAdmin = user?.role === 'admin';
  const canAddMembersWithDefault = isAdmin;
  
  // Debug the user context to see what we're getting
  console.log('TeamActionsClient - user context data:', user);

  console.log('TeamActionsClient - user role:', user?.role);
  console.log('TeamActionsClient - isAdmin:', isAdmin);
  console.log('TeamActionsClient - canAddMembers:', canAddMembersWithDefault);
  console.log('TeamActionsClient - permission details:', {
    userRole: user?.role,
    isAdmin,
    teamId: team.id,
  });

  console.log('== ACTION PERMISSION DEBUG BUTTON DISPLAY ==');
  console.log('Button should display:', canAddMembersWithDefault);
  console.log('Button details:', {
    userRole: user?.role,
    isAdmin,
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
