'use client';

import { useSearchParams } from 'next/navigation';

import TeamOverview from '../TeamOverview';

import { MembersTab } from './MembersTab';
import { ResourcesTab } from './ResourcesTab';

interface TeamTabsProps {
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

export default function TeamTabs({ teamDetails, unassignedResources }: TeamTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <div className="space-y-6">
      {activeTab === 'overview' && (
        <TeamOverview team={teamDetails} _unassignedResources={unassignedResources} />
      )}

      {activeTab === 'members' && (
        <MembersTab
          teamId={teamDetails?.id || null}
          userRole={teamDetails?.userRole}
          subscriptionTier={teamDetails?.subscription_tier}
        />
      )}

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
