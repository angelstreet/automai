'use client';

import { useTranslations } from 'next-intl';
import TeamOverview from '../TeamOverview';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/shadcn/card';
import { ResourceCard } from '@/components/ui/resource-card';

import { MembersTab } from './MembersTab';
import { ResourcesTab } from './ResourcesTab';

interface TeamTabsProps {
  activeTab: string;
  teamDetails: {
    id: string | null;
    name: string;
    subscription_tier: string;
    memberCount: number;
    userRole?: string;
    ownerId: string | null;
    ownerEmail?: string | null;
    resourceCounts: {
      repositories: number;
      hosts: number;
      cicd: number;
    };
  } | null;
  unassignedResources: {
    repositories: any[];
  };
}

export default function TeamTabs({ activeTab, teamDetails, unassignedResources }: TeamTabsProps) {
  const t = useTranslations('team');

  return (
    <div className="space-y-6">
      {activeTab === 'overview' && (
        <TeamOverview team={teamDetails} unassignedResources={unassignedResources} />
      )}

      {activeTab === 'members' && <MembersTab teamId={teamDetails?.id || null} />}

      {activeTab === 'resources' && (
        <ResourcesTab
          teamDetails={
            teamDetails || {
              id: null,
              resourceCounts: { repositories: 0, hosts: 0, cicd: 0 },
            }
          }
        />
      )}
    </div>
  );
}
