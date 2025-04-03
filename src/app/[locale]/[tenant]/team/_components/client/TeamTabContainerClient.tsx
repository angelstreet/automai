'use client';

import { useSearchParams } from 'next/navigation';

import { TeamMemberDialogProvider } from '@/app/providers/TeamMemberDialogProvider';
import { useTeam } from '@/hooks/useTeam';
import { TeamDetails } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

import TeamOverview from '../TeamOverview';
import OverviewTabSkeleton from '../TeamOverviewSkeleton';

import TeamMemberDialogsClient from './TeamMemberDialogsClient';
import { MembersTab } from './TeamMembersTabClient';

interface TeamTabContainerProps {
  user?: User | null;
  resourceCounts?: {
    repositories: number;
    hosts: number;
    cicd: number;
    deployments: number;
  };
}

export default function TeamTabContainerClient({ user, resourceCounts }: TeamTabContainerProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Get team data from context
  const { activeTeam } = useTeam('TeamTabContainerClient');

  // Debug output to help troubleshoot the issue
  console.log('TeamTabContainerClient - activeTeam raw:', activeTeam);

  // Convert activeTeam to TeamDetails type with proper structure and safe defaults
  const teamDetails: TeamDetails | null = activeTeam
    ? {
        id: activeTeam.id || null,
        name: activeTeam.name || 'Team',
        // Use the subscription tier from team object or default to trial
        subscription_tier:
          // Try to access subscription_tier through a type assertion if needed
          (activeTeam as any).subscriptionTier || // From getTeamDetails action
          (activeTeam as any).subscription_tier || // Alternate property name
          'trial', // Default fallback
        memberCount: 'memberCount' in activeTeam ? (activeTeam.memberCount as number) : 0,
        // Change null to undefined to match TeamDetails interface
        role: 'role' in activeTeam ? (activeTeam.role as string) : undefined,
        ownerId: 'ownerId' in activeTeam ? (activeTeam.ownerId as string) : null,
        ownerEmail: 'ownerEmail' in activeTeam ? (activeTeam.ownerEmail as string) : null,
        resourceCounts: resourceCounts || {
          repositories: 0,
          hosts: 0,
          cicd: 0,
          deployments: 0,
        },
      }
    : null;

  // Log final team details for debugging
  console.log('TeamTabContainerClient - final teamDetails:', teamDetails);

  // Show skeleton when team data is not available
  if (!activeTeam) {
    return (
      <div className="space-y-6">{activeTab === 'overview' ? <OverviewTabSkeleton /> : null}</div>
    );
  }

  return (
    <TeamMemberDialogProvider teamId={teamDetails?.id || null} onMembersChanged={() => {}}>
      <div className="space-y-6">
        {activeTab === 'overview' && <TeamOverview team={teamDetails} />}

        {activeTab === 'members' && (
          <MembersTab
            teamId={teamDetails?.id || null}
            userRole={teamDetails?.role}
            subscriptionTier={teamDetails?.subscription_tier}
            user={user}
          />
        )}

        {/* Team member dialogs */}
        <TeamMemberDialogsClient />
      </div>
    </TeamMemberDialogProvider>
  );
}
