'use client';

import { PlusIcon, Settings } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/shadcn/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

import { TeamDetails } from '../types';

export default function TeamHeader({ team }: { team: TeamDetails }) {
  const t = useTranslations('team');
  const hasTeam = Boolean(team.id);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const userRole = team.role || t('noRole');

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        {/* Team Selector */}
        <div className="flex items-center">
          <div className="bg-primary/10 p-2 rounded-md mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{team.name}</h2>
            <p className="text-sm text-muted-foreground">
              {userRole}
              {team.id && <span className="ml-1">- {team.id}</span>}
            </p>
          </div>
        </div>

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
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="members">{t('membersTab.title')}</TabsTrigger>
          <TabsTrigger value="resources">{t('tabs.resources')}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
