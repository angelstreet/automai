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
  // Extract the actual subscription tier with better defaults
  // If the Team object doesn't have a subscription_tier, get it from the user's tenant if possible
  const subscriptionTier =
    ('subscription_tier' in activeTeam ? (activeTeam.subscription_tier as string) : null) ||
    ('tenant_name' in activeTeam ? (activeTeam.tenant_name as string) : null) ||
    'pro'; // Default to 'pro' for testing
  // Convert activeTeam to TeamDetails type with proper structure and safe defaults
  const teamDetails: TeamDetails | null = activeTeam
    ? {
        id: activeTeam.id || null,
        name: activeTeam.name || 'Team',
        // Set subscription tier from either activeTeam or user's tenant_name
        subscription_tier: subscriptionTier,
        memberCount: 'memberCount' in activeTeam ? (activeTeam.memberCount as number) : 0,
        // Use user.role directly as the primary source of role information
        role: user?.role || ('role' in activeTeam ? (activeTeam.role as string) : null),
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
            subscriptionTier={teamDetails?.subscription_tier}
          />
        )}

        {/* Team member dialogs */}
        <TeamMemberDialogsClient />
      </div>
    </TeamMemberDialogProvider>
  );
}
