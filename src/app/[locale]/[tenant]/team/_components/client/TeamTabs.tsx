'use client';

import { useSearchParams } from 'next/navigation';

import { User } from '@/types/user';

import { TeamDetails, UnassignedResources } from '../../types';
import TeamOverview from '../TeamOverview';

import { MembersTab } from './MembersTab';

interface TeamTabsProps {
  teamDetails: TeamDetails | null;
  unassignedResources: UnassignedResources;
  user?: User | null;
  hostsCount?: number;
}

export default function TeamTabs({
  teamDetails,
  unassignedResources,
  user,
  hostsCount = 0,
}: TeamTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <div className="space-y-6">
      {activeTab === 'overview' && (
        <TeamOverview
          team={teamDetails}
          _unassignedResources={unassignedResources}
          user={user}
          hostsCount={hostsCount}
        />
      )}

      {activeTab === 'members' && (
        <MembersTab
          teamId={teamDetails?.id || null}
          userRole={teamDetails?.role}
          subscriptionTier={teamDetails?.subscription_tier}
          user={user}
        />
      )}
    </div>
  );
}
