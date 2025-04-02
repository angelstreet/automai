'use client';

import { useSearchParams } from 'next/navigation';

import { useTeam } from '@/hooks/useTeam';
import { TeamDetails } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

import TeamOverview from '../TeamOverview';
import OverviewTabSkeleton from '../TeamOverviewSkeleton';

import { MembersTab } from './TeamMembersTabClient';

interface TeamTabsProps {
  unassignedResources?: { repositories: any[] };
  user?: User | null;
  resourceCounts?: {
    repositories: number;
    hosts: number;
    cicd: number;
    deployments: number;
  };
}

export default function TeamTabs({
  unassignedResources = { repositories: [] },
  user,
  resourceCounts,
}: TeamTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Get team data and loading state from context
  const { activeTeam, loading } = useTeam('TeamTabsClient');

  // Convert activeTeam to TeamDetails type with proper structure
  const teamDetails: TeamDetails | null = activeTeam
    ? {
        id: activeTeam.id || null,
        name: activeTeam.name || 'Team',
        subscription_tier: activeTeam.subscription_tier || 'trial',
        memberCount: activeTeam.memberCount || 0,
        role: activeTeam.role,
        ownerId: activeTeam.ownerId || null,
        ownerEmail: activeTeam.ownerEmail || null,
        resourceCounts: resourceCounts || {
          repositories: 0,
          hosts: 0,
          cicd: 0,
          deployments: 0,
        },
      }
    : null;

  // Debug output to help troubleshoot the issue
  console.log('TeamTabsClient - activeTeam:', activeTeam);
  console.log('TeamTabsClient - resourceCounts from props:', resourceCounts);
  console.log('TeamTabsClient - teamDetails:', teamDetails);

  // Show appropriate loading state based on active tab
  // Only show skeleton for overview when loading general team data
  // Only show skeleton for members tab when loading members data
  if (loading || !activeTeam) {
    return (
      <div className="space-y-6">{activeTab === 'overview' ? <OverviewTabSkeleton /> : null}</div>
    );
  }

  // Don't display loading state for members tab here
  // The MembersTab component handles its own loading state now

  return (
    <div className="space-y-6">
      {activeTab === 'overview' && (
        <TeamOverview team={teamDetails} _unassignedResources={unassignedResources} user={user} />
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
