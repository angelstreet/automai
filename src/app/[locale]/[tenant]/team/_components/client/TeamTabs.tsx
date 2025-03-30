'use client';

import { useSearchParams } from 'next/navigation';
import { useTeam } from '@/context/TeamContext';
import { User } from '@/types/user';
import { TeamDetails } from '@/types/team';

import TeamOverview from '../TeamOverview';
import { MembersTab } from './MembersTab';

interface TeamTabsProps {
  unassignedResources: { repositories: any[] };
  user?: User | null;
}

export default function TeamTabs({ unassignedResources, user }: TeamTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Get team data from context instead of props
  const { activeTeam } = useTeam();

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

  if (!activeTeam) {
    return (
      <div className="p-4 text-center">
        <p>Loading team details...</p>
      </div>
    );
  }

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
