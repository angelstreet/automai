'use client';

import { MoreHorizontal, PlusIcon, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { TeamMemberDetails } from '@/app/[locale]/[tenant]/team/types';
import { removeTeamMember } from '@/app/actions/team';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader } from '@/components/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
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
import { useTeam } from '@/context/TeamContext';
import { User } from '@/types/user';

import MembersTabSkeleton from '../MembersTabSkeleton';

interface MembersTabProps {
  teamId: string | null;
  userRole?: string;
  subscriptionTier?: string;
  user?: User | null;
}

export function MembersTab({ teamId, userRole, subscriptionTier, user: _user }: MembersTabProps) {
  const t = useTranslations('team');
  const { getTeamMembers, invalidateTeamMembersCache } = useTeam();
  const [members, setMembers] = useState<TeamMemberDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberDetails | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const canManageMembers =
    userRole && ['owner', 'admin'].includes(userRole.toLowerCase()) && subscriptionTier !== 'trial';

  useEffect(() => {
    const fetchMembers = async () => {
      if (!teamId) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Use the cached function from context instead of direct server action
        const membersData = await getTeamMembers(teamId);
        setMembers(membersData as TeamMemberDetails[]);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [teamId, getTeamMembers]);

  const handleRemoveMember = async () => {
    if (!teamId || !memberToRemove) return;

    try {
      setIsRemoving(true);
      const result = await removeTeamMember(teamId, memberToRemove.profile_id);

      if (result.success) {
        // Invalidate the cache for this team
        invalidateTeamMembersCache(teamId);

        // Remove from local state
        setMembers((current) =>
          current.filter((member) => member.profile_id !== memberToRemove.profile_id),
        );

        setRemoveDialogOpen(false);
      } else {
        console.error('Failed to remove team member:', result.error);
      }
    } catch (error) {
      console.error('Error removing team member:', error);
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      (member.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return <MembersTabSkeleton />;
  }

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

  return (
    <>
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
              <Button disabled={!teamId} size="sm">
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
                            <DropdownMenuItem>
                              {t('membersTab.memberActions.changeRole')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setMemberToRemove(member);
                                setRemoveDialogOpen(true);
                              }}
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

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {memberToRemove?.user?.name ||
                  memberToRemove?.profiles?.tenant_name ||
                  t('membersTab.unknownUser')}
              </strong>{' '}
              from this team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isRemoving}>
              {isRemoving ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
