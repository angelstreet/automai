'use client';

import { PlusIcon, Settings } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { User } from '@/types/user';

import { TeamDetails } from '../types';

export default function TeamHeader({
  team,
  user: _user,
}: {
  team: TeamDetails;
  user?: User | null;
}) {
  const t = useTranslations('team');
  const hasTeam = Boolean(team.id);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Use role property from team data
  const _userRole = team.role || '';

  const _getRoleBadgeColor = (role: string) => {
    if (!role) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'member':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const _getInitials = (name: string) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  // Log the team data to debug
  console.log('TeamHeader received team:', JSON.stringify(team, null, 2));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        {/* Actions */}
        <div className="flex gap-2 items-center">
          {hasTeam && team.subscription_tier !== 'trial' && (
            <>
              <Button variant="outline" size="sm" disabled={!hasTeam}>
                <PlusIcon className="h-4 w-4 mr-1" />
                {t('addMember')}
              </Button>
              <Button variant="outline" size="sm" disabled={!hasTeam}>
                <Settings className="h-4 w-4 mr-1" />
                {t('settings')}
              </Button>
            </>
          )}
          {!hasTeam && (
            <Button variant="default" size="sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('createTeam')}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="members">{t('membersTab.title')}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
