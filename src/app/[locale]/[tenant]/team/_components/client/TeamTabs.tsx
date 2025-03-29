'use client';

import { useSearchParams } from 'next/navigation';

import { TeamDetails, UnassignedResources } from '../../types';
import TeamOverview from '../TeamOverview';

import { MembersTab } from './MembersTab';
import { ResourcesTab } from './ResourcesTab';

interface TeamTabsProps {
  teamDetails: TeamDetails | null;
  unassignedResources: UnassignedResources;
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
          userRole={teamDetails?.role}
          subscriptionTier={teamDetails?.subscription_tier}
        />
      )}

      {activeTab === 'resources' && (
        <ResourcesTab
          teamDetails={
            teamDetails || {
              id: null,
              name: 'Personal Team',
              subscription_tier: 'trial',
              resourceCounts: { repositories: 0, hosts: 0, cicd: 0 },
            }
          }
        />
      )}
    </div>
  );
}
