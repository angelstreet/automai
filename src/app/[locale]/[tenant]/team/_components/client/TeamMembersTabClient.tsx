'use client';

import { MoreHorizontal, PlusIcon, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  TeamMemberDialogProvider,
  useTeamMemberDialog,
} from '@/app/providers/TeamMemberDialogProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader } from '@/components/shadcn/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Input } from '@/components/shadcn/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { usePermissionWithSubscription } from '@/hooks/usePermission';
import { useRemoveTeamMember } from '@/hooks/useTeamMemberManagement';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { ResourceType } from '@/types/context/permissionsContextType';
import { TeamMemberResource, TeamMemberDetails } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';
import { useTeam } from '@/hooks/useTeam';

import TeamMembersTableSkeleton from '../TeamMembersTableSkeleton';
import { EmptyState } from '@/components/EmptyState';

interface MembersTabProps {
  teamId: string | null;
  subscriptionTier?: string;
  userRole?: string | null;
  user?: User | null;
}

// Inner component that uses the dialog context
function MembersTabContent({
  teamId,
  subscriptionTier,
  members,
  onRemoveMember,
  isLoading,
  searchQuery,
  setSearchQuery,
}: {
  teamId: string | null;
  subscriptionTier?: string;
  members: TeamMemberDetails[];
  onRemoveMember: (memberId: string) => Promise<void>;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const t = useTranslations('team');
  const { canManageMembers } = usePermissionWithSubscription('TeamMembersTabClient');
  const { openAddDialog, openEditDialog } = useTeamMemberDialog();

  // Debug logging for permission checks - reduced for clarity
  console.log('== TEAM MEMBERS PERMISSION ==');
  console.log('Subscription tier from props:', subscriptionTier);
  console.log('Can manage members:', canManageMembers());

  // Use a defaulted subscription tier value if it's undefined
  // Note: 'trial' is the only tier that restricts functionality
  // The subscription tier comes from the tenant table in the database,
  // where each tenant has a subscription_tier_id
  const effectiveSubscriptionTier = subscriptionTier || 'trial'; // Default to trial for safety
  const canManageMembersWithDefault = canManageMembers() && effectiveSubscriptionTier !== 'trial';

  // Filter members based on search
  const filteredMembers = members.filter(
    (member) =>
      (member.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'member':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';

    // Handle names with spaces (first and last name)
    if (name.includes(' ')) {
      const nameParts = name.split(' ');
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }

    // Handle single name (use first two characters)
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return <TeamMembersTableSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('membersTab.search')}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canManageMembersWithDefault && (
            <Button disabled={!teamId} size="sm" onClick={() => openAddDialog()}>
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('membersTab.add')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{t('membersTab.name')}</TableHead>
              <TableHead>{t('membersTab.team')}</TableHead>
              <TableHead>{t('membersTab.email')}</TableHead>
              <TableHead>{t('membersTab.role')}</TableHead>
              {canManageMembersWithDefault && (
                <TableHead className="text-right">{t('membersTab.actions')}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageMembersWithDefault ? 6 : 5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery
                    ? t('membersTab.noSearchResults')
                    : teamId
                      ? t('membersTab.noMembers')
                      : t('membersTab.noTeam')}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.profile_id}>
                  <TableCell className="py-2">
                    <Avatar>
                      <AvatarImage
                        src={member.user?.avatar_url || member.profiles?.avatar_url || ''}
                        alt={member.user?.name || ''}
                      />
                      <AvatarFallback>{getInitials(member.user?.name)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="py-2 font-medium">
                    {member.user?.name || t('membersTab.unknownUser')}
                  </TableCell>
                  <TableCell className="py-2">{t('membersTab.defaultTeam')}</TableCell>
                  <TableCell className="py-2">
                    {member.user?.email &&
                    member.user.email !== 'Email unavailable in profiles table'
                      ? member.user.email
                      : t('membersTab.noEmail')}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge className={getRoleBadgeColor(member.role)} variant="outline">
                      {member.role}
                    </Badge>
                  </TableCell>
                  {canManageMembersWithDefault && (
                    <TableCell className="py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              const memberResource: TeamMemberResource = {
                                id: member.profile_id,
                                profile_id: member.profile_id,
                                name: member.user?.name || t('membersTab.unknownUser'),
                                email: member.user?.email || t('membersTab.noEmail'),
                                avatar_url: member.user?.avatar_url,
                                role: member.role,
                              };
                              openEditDialog(memberResource);
                            }}
                          >
                            {t('membersTab.memberActions.changePermissions')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onRemoveMember(member.profile_id)}
                          >
                            {t('membersTab.memberActions.remove')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Add missing type definition for PaginationState
interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

// Add missing getTeamMembersData function
function getTeamMembersData(result: any): TeamMemberDetails[] {
  if (!result || !result.success || !result.data) {
    return [];
  }
  return result.data;
}

// Main exported component that provides the dialog context
export function MembersTab({
  teamId,
  subscriptionTier,
  userRole: _userRole,
  user: _user,
}: MembersTabProps) {
  const t = useTranslations('team');
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Get active team and members
  const { activeTeam } = useTeam('TeamMembersTabClient');
  const teamIdToUse = teamId || activeTeam?.id || '';
  const { data: teamMembersResult, isLoading } = useTeamMembers(teamIdToUse);
  const members = getTeamMembersData(teamMembersResult);

  // Get the remove team member mutation
  const removeTeamMemberMutation = useRemoveTeamMember();

  // Get permissions for the team
  const { canManageMembers } = usePermissionWithSubscription('TeamMembersTabClient');

  // Debug logs
  console.log('== TEAM MEMBERS TAB RENDERED ==');
  console.log('TeamMembersTabClient - subscriptionTier prop:', subscriptionTier);
  console.log('TeamMembersTabClient - activeTeam:', activeTeam);

  // Skip loading if we're not on this tab
  if (searchParams.get('tab') !== 'members' && !isLoading) {
    return null;
  }

  const handleRemoveMember = async (profileId: string) => {
    try {
      await removeTeamMemberMutation.mutateAsync({ teamId: teamIdToUse, profileId });
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  // Return to original TeamMembersTabContent structure
  return (
    <div className="space-y-4">
      <TeamMemberDialogProvider teamId={teamIdToUse} onMembersChanged={() => {}}>
        <MembersTabContent
          teamId={teamIdToUse}
          subscriptionTier={subscriptionTier}
          members={members}
          onRemoveMember={handleRemoveMember}
          isLoading={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </TeamMemberDialogProvider>
    </div>
  );
}
