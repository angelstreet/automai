'use client';

import { MoreHorizontal, Search, ShieldAlert, Mail, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useContext } from 'react';

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip';
import { TeamMemberDialogContext } from '@/context/TeamMemberDialogContext';
import { usePermission } from '@/hooks';
import { useRemoveTeamMember } from '@/hooks/useTeamMemberManagement';
import { useTeamMembers } from '@/hooks/useTeamMembers';
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
  members,
  onRemoveMember,
  isLoading,
  searchQuery,
  setSearchQuery,
}: {
  teamId: string | null;
  members: TeamMemberDetails[];
  onRemoveMember: (memberId: string) => Promise<void>;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const t = useTranslations('team');
  const c = useTranslations('common');
  // Safely try to access the dialog context - may not be available
  const dialogContext = useContext(TeamMemberDialogContext);
  // Use the dialog functions if context is available
  const openEditDialog = dialogContext?.openEditDialog;
  const openAddDialog = dialogContext?.openAddDialog;
  const openInviteDialog = dialogContext?.openInviteDialog;

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
              placeholder={c('search')}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canManageMembers && openAddDialog && openInviteDialog && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={openInviteDialog}>
                <Mail className="mr-2 h-4 w-4" />
                {t('members_invite')}
              </Button>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {t('members_add_button')}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{c('name')}</TableHead>
              <TableHead>{c('team')}</TableHead>
              <TableHead>{c('email')}</TableHead>
              <TableHead>{t('members_role')}</TableHead>
              {canManageMembers && <TableHead className="text-right">{c('actions')}</TableHead>}
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
                    ? t('members_add_no_results')
                    : teamId
                      ? t('members_none')
                      : t('create_team')}
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
                    {member.user?.name || t('unknown')}
                  </TableCell>
                  <TableCell className="py-2">{member.team_name}</TableCell>
                  <TableCell className="py-2">
                    {member.user?.email &&
                    member.user.email !== 'Email unavailable in profiles table'
                      ? member.user.email
                      : t('error_email_required')}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge className={getRoleBadgeColor(member.role)} variant="outline">
                      {member.role}
                      {member.role.toLowerCase() === 'admin' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ShieldAlert
                                className="ml-1 h-3 w-3 inline"
                                aria-label="Admin protection"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {t('admin_protection_tooltip', {
                                  fallback: 'Admin users cannot be edited or removed for safety',
                                })}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
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
                                name: member.user?.name || t('unknown'),
                                email: member.user?.email || t('error_email_required'),
                                avatar_url: member.user?.avatar_url,
                                role: member.role,
                              };
                              if (openEditDialog) {
                                openEditDialog(memberResource);
                              } else {
                                console.warn('Dialog context not available');
                              }
                            }}
                            disabled={member.role.toLowerCase() === 'admin'}
                          >
                            {c('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onRemoveMember(member.profile_id)}
                            disabled={member.role.toLowerCase() === 'admin'}
                          >
                            {c('remove')}
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
      {/* Don't render AddMemberDialog here - it's handled by TeamMemberDialogsClient */}
    </Card>
  );
}

// Main exported component that provides the dialog context
export function MembersTab({
  teamId,
  subscriptionTier: _subscriptionTier,
  initialMembers = [],
}: MembersTabProps & { initialMembers?: TeamMember[] }) {
  // Only fetch if we don't have initial data or when we explicitly need to
  const teamMembersQuery = useTeamMembers(teamId);
  const [searchQuery, setSearchQuery] = useState('');
  const { openAddDialog } = useContext(TeamMemberDialogContext) || {};
  const removeTeamMemberMutation = useRemoveTeamMember();

  // State to track whether we're using initial data
  const [usingInitialData, setUsingInitialData] = useState(initialMembers.length > 0);

  // Members state to display in the UI
  const [members, setMembers] = useState<TeamMemberDetails[]>(
    initialMembers.length > 0 ? (initialMembers as TeamMemberDetails[]) : [],
  );

  // Handle data from query only if we're not using initial data
  useEffect(() => {
    // Only update from query if:
    // 1. We don't have initial data OR
    // 2. Initial data was empty but query returned results
    if (!usingInitialData || (usingInitialData && members.length === 0)) {
      if (teamMembersQuery.data?.success && teamMembersQuery.data?.data) {
        console.log(
          '[@component:TeamMembersTab] Using query data:',
          teamMembersQuery.data.data.length,
        );
        setMembers(teamMembersQuery.data.data as TeamMemberDetails[]);
      }
    } else {
      // We have initial data, log it
      console.log('[@component:TeamMembersTab] Using initial server data:', members.length);
    }
  }, [teamMembersQuery.data, usingInitialData, members.length]);

  // Handle errors
  useEffect(() => {
    if (teamMembersQuery.isError) {
      console.error(
        '[@component:TeamMembersTab] Error fetching team members:',
        teamMembersQuery.error,
      );
    }
  }, [teamMembersQuery.isError, teamMembersQuery.error]);

  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[@component:TeamMembersTab] Manual refresh triggered');
      setUsingInitialData(false); // Stop using initial data
      teamMembersQuery.refetch(); // Force refetch
    };

    window.addEventListener('refresh-team-members', handleRefresh);
    return () => window.removeEventListener('refresh-team-members', handleRefresh);
  }, [teamMembersQuery]);

  const handleRemoveMember = async (profileId: string) => {
    if (!teamId) return;

    try {
      // Find the member to check if they're an admin
      const memberToRemove = members.find((member) => member.profile_id === profileId);

      // Prevent removing admin users
      if (memberToRemove && memberToRemove.role.toLowerCase() === 'admin') {
        console.warn(
          '[@component:TeamMembersTab] Attempted to remove an admin user - operation blocked',
        );
        return;
      }

      // Use the mutation hook instead of direct action call
      await removeTeamMemberMutation.mutateAsync({ teamId, profileId });

      // Immediately update local state for user feedback
      setMembers((current) => current.filter((member) => member.profile_id !== profileId));

      // After remove, set using initial data to false and refetch
      setUsingInitialData(false);
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  // Only show loading when we have no data at all and are fetching
  const isLoading = members.length === 0 && teamMembersQuery.isLoading;

  return (
    <MembersTabContent
      teamId={teamId}
      members={members}
      onRemoveMember={handleRemoveMember}
      isLoading={isLoading}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

// We now use TeamMemberDialogsClient instead of directly using AddMemberDialog
