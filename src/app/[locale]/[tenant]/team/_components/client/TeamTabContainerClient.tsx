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

  // Get team data from context and user data
  const { activeTeam } = useTeam('TeamTabContainerClient');

  // Debug output to help troubleshoot the issue
  console.log('TeamTabContainerClient - activeTeam raw:', activeTeam);

  // Extract the actual subscription tier with better defaults
  // If the Team object doesn't have a subscription_tier, get it from the user's tenant if possible
  const subscriptionTier =
    ('subscription_tier' in activeTeam ? (activeTeam.subscription_tier as string) : null) ||
    ('tenant_name' in activeTeam ? (activeTeam.tenant_name as string) : null) ||
    'pro'; // Default to 'pro' for testing
    
  // Debug user data to ensure we have the role
  console.log('TeamTabContainerClient - user data:', user);

  // Convert activeTeam to TeamDetails type with proper structure and safe defaults
  const teamDetails: TeamDetails | null = activeTeam
    ? {
        id: activeTeam.id || null,
        name: activeTeam.name || 'Team',
        // Set a non-trial subscription tier by default
        subscription_tier: subscriptionTier,
        memberCount: 'memberCount' in activeTeam ? (activeTeam.memberCount as number) : 0,
        role: 'role' in activeTeam ? (activeTeam.role as string) : null,
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

  // Debug output to help troubleshoot the issue
  console.log('TeamTabContainerClient - activeTeam:', activeTeam);
  console.log('TeamTabContainerClient - resourceCounts from props:', resourceCounts);
  console.log('TeamTabContainerClient - teamDetails:', teamDetails);

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
