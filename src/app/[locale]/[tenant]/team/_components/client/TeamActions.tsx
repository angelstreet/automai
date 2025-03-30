'use client';

import { PlusIcon, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';
import { useTeam } from '@/context/TeamContext';
import { TeamDetails } from '@/types/team';

export default function TeamActions() {
  const t = useTranslations('team');
  const { activeTeam } = useTeam();

  // Treat activeTeam as TeamDetails
  const team = activeTeam as unknown as TeamDetails;

  if (!team) {
    return (
      <Button variant="default" size="sm">
        <PlusIcon className="h-4 w-4 mr-1" />
        {t('createTeam')}
      </Button>
    );
  }

  // For trial tier, don't show buttons or show limited options
  if (team.subscription_tier === 'trial') {
    return null;
  }

  return (
    <div className="flex gap-2 items-center">
      <Button variant="outline" size="sm">
        <PlusIcon className="h-4 w-4 mr-1" />
        {t('addMember')}
      </Button>
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-1" />
        {t('settings')}
      </Button>
    </div>
  );
}
