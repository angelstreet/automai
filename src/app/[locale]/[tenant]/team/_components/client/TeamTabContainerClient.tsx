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

  // Check if subscriptionTier exists in the activeTeam from server (it should be added directly)
  const serverSubscriptionTier = (activeTeam as any)?.subscription_tier;
  console.log('TeamTabContainerClient - server subscription tier:', serverSubscriptionTier);

  // Convert activeTeam to TeamDetails type with proper structure and safe defaults
  const teamDetails: TeamDetails | null = activeTeam
    ? {
        id: activeTeam.id || null,
        name: activeTeam.name || 'Team',
        // Use the subscription tier from server or from tenant
        subscription_tier:
          serverSubscriptionTier || // First priority: directly from server
          'trial', // Default fallback
        memberCount: 'memberCount' in activeTeam ? (activeTeam.memberCount as number) : 0,
        // Fix the role issue - make sure we have a valid role (default to 'admin' for owner)
        role: 'role' in activeTeam ? (activeTeam.role as string) || 'admin' : 'admin', // Default to admin if missing
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
