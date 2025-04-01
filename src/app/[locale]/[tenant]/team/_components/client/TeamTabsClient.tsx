'use client';

import { useSearchParams } from 'next/navigation';

import { useTeam } from '@/context';
import { TeamDetails } from '@/types/context/team';
import { User } from '@/types/auth/user';

import TeamOverviewSkeleton from '../TeamOverviewSkeleton';
import TeamOverview from '../TeamOverview';

import { MembersTab } from './TeamMembersTabClient';

interface TeamTabsProps {
  unassignedResources?: { repositories: any[] };
  user?: User | null;
}

export default function TeamTabs({
  unassignedResources = { repositories: [] },
  user,
}: TeamTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Get team data and loading state from context
  const { activeTeam, loading } = useTeam();

  // Convert activeTeam to TeamDetails type with proper structure
  const teamDetails: TeamDetails = activeTeam
    ? {
        id: activeTeam.id || null,
        name: activeTeam.name || 'Team',
        subscription_tier: activeTeam.subscription_tier || 'trial',
        memberCount: activeTeam.memberCount || 0,
        role: activeTeam.role,
        ownerId: activeTeam.ownerId || null,
        ownerEmail: activeTeam.ownerEmail || null,
        resourceCounts: {
          repositories: activeTeam.resourceCounts?.repositories || 0,
          hosts: activeTeam.resourceCounts?.hosts || 0,
          cicd: activeTeam.resourceCounts?.cicd || 0,
          deployments: activeTeam.resourceCounts?.deployments || 0,
        },
      }
    : null;

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
