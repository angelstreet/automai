'use client';

import { MoreHorizontal, PlusIcon, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

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
import { usePermission } from '@/hooks';
import { useRemoveTeamMember } from '@/hooks/useTeamMemberManagement';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { ResourceType } from '@/types/context/permissionsContextType';
import { TeamMemberResource, TeamMemberDetails } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

import TeamMembersTableSkeleton from '../TeamMembersTableSkeleton';

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
  const { openAddDialog, openEditDialog, addDialogOpen, setAddDialogOpen } = useTeamMemberDialog();

  // Use the centralized permission hook to check if user can manage team members
  const { canManageTeamMembers } = usePermission();
  const canManageMembers = canManageTeamMembers();


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
          {canManageMembers && (
            <>
              <Button onClick={openAddDialog}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {t('membersTab.add')}
              </Button>
            </>
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
              {canManageMembers && (
                <TableHead className="text-right">{t('membersTab.actions')}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageMembers ? 6 : 5}
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
                  {canManageMembers && (
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
      {/* Render the AddMemberDialog */}
      {canManageMembers && (
        <AddMemberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} teamId={teamId} />
      )}
    </Card>
  );
}

// Main exported component that provides the dialog context
export function MembersTab({ teamId, subscriptionTier }: MembersTabProps) {
  const teamMembersQuery = useTeamMembers(teamId);
  const [members, setMembers] = useState<TeamMemberDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Use our new React Query hook for removing team members
  const removeTeamMemberMutation = useRemoveTeamMember();

  useEffect(() => {
    const fetchMembers = async () => {
      if (!teamId) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Use the data from the useTeamMembers hook
        const queryData = teamMembersQuery.data;
        if (
          queryData &&
          'success' in queryData &&
          queryData.success &&
          'data' in queryData &&
          queryData.data
        ) {
          setMembers(queryData.data as TeamMemberDetails[]);
        } else {
          setMembers([]);
        }
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [teamId, teamMembersQuery.data]);

  const handleRemoveMember = async (profileId: string) => {
    if (!teamId) return;

    try {
      // Use the mutation hook instead of direct action call
      await removeTeamMemberMutation.mutateAsync({ teamId, profileId });

      // The mutation will handle invalidation through its onSuccess callback
      // But we still update the local state for immediate UI feedback
      setMembers((current) => current.filter((member) => member.profile_id !== profileId));
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  // Handle members list refresh when dialogs make changes
  const handleMembersChanged = async () => {
    if (teamId) {
      try {
        // Invalidate the cache and fetch fresh data
        teamMembersQuery.refetch();
      } catch (error) {
        console.error('Failed to refresh team members:', error);
      }
    }
  };

  return (
    <TeamMemberDialogProvider teamId={teamId} onMembersChanged={handleMembersChanged}>
      <MembersTabContent
        teamId={teamId}
        subscriptionTier={subscriptionTier}
        members={members}
        onRemoveMember={handleRemoveMember}
        isLoading={isLoading || teamMembersQuery.isLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </TeamMemberDialogProvider>
  );
}

import AddMemberDialog from './TeamMemberAddDialogClient';
