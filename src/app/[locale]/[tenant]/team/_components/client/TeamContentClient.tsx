'use client';

import { useSearchParams } from 'next/navigation';

import { TeamMemberDialogProvider } from '@/app/providers/TeamMemberDialogProvider';
import { useTeam } from '@/hooks/useTeam';
import { TeamDetails, TeamMember } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

import TeamOverview from '../TeamOverview';
import OverviewTabSkeleton from '../TeamOverviewSkeleton';

import TeamMemberDialogsClient from './TeamMemberDialogsClient';
import { MembersTab } from './TeamMembersTabClient';

interface TeamTabContainerProps {
  user?: User | null;
  teamDetails?: {
    team: any;
    memberCount: number;
    userRole: string | null;
    resourceCounts: {
      repositories: number;
      hosts: number;
      deployments: number;
    };
  } | null;
  teamMembers?: TeamMember[];
}

export default function TeamContentClient({
  user,
  teamDetails,
  teamMembers = [],
}: TeamTabContainerProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const { activeTeam } = useTeam('TeamContentClient');

  // Show skeleton when team data is not available
  if (!teamDetails || !teamDetails.team) {
    return (
      <div className="space-y-6">{activeTab === 'overview' ? <OverviewTabSkeleton /> : null}</div>
    );
  }

  const formattedTeamDetails: TeamDetails = {
    id: activeTeam?.id || null,
    name: activeTeam?.name || 'Team',
    subscription_tier: activeTeam?.subscription_tier || 'pro',
    memberCount: teamDetails?.memberCount || 0,
    role: teamDetails?.userRole || user?.role || (activeTeam?.role ? activeTeam.role : undefined),
    ownerId: activeTeam?.ownerId || null,
    ownerEmail: activeTeam?.ownerEmail || null,
    resourceCounts: teamDetails?.resourceCounts || {
      repositories: 0,
      hosts: 0,
      deployments: 0,
    },
  };

  return (
    <TeamMemberDialogProvider
      teamId={formattedTeamDetails.id}
      onMembersChanged={() => {
        // When members change, we can add a refetch or invalidation here if needed
        if (activeTab === 'members') {
          // This will trigger refetch in MembersTab internal state
          // No action needed as members tab has its own refresh logic
        }
      }}
    >
      <div className="space-y-6">
        {activeTab === 'overview' && <TeamOverview team={formattedTeamDetails} />}

        {activeTab === 'members' && (
          <MembersTab
            teamId={formattedTeamDetails.id}
            subscriptionTier={formattedTeamDetails.subscription_tier}
            initialMembers={teamMembers}
          />
        )}

        {/* Team member dialogs */}
        <TeamMemberDialogsClient />
      </div>
    </TeamMemberDialogProvider>
  );
}
