'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { Badge } from '@/components/shadcn/badge';
import { MoreHorizontal, PlusIcon, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';

import { TeamMember } from '@/types/context/team';
import { getTeamMembers } from '@/app/[locale]/[tenant]/team/actions';
import MembersTabSkeleton from '../MembersTabSkeleton';

interface MembersTabProps {
  teamId: string | null;
  userRole?: string;
  subscriptionTier?: string;
}

export function MembersTab({ teamId, userRole, subscriptionTier }: MembersTabProps) {
  const t = useTranslations('team');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        const result = await getTeamMembers(teamId);
        if (result.success && result.data) {
          setMembers(result.data);
        } else {
          console.error('Failed to fetch team members:', result.error);
          setMembers([]);
        }
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [teamId]);

  const filteredMembers = members.filter(
    (member) =>
      member.profiles.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const getInitials = (email: string | undefined) => {
    if (!email) return '?';
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>{t('members.title')}</CardTitle>
          {canManageMembers && (
            <Button disabled={!teamId} size="sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('members.add')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('members.search')}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{t('members.name')}</TableHead>
              <TableHead>{t('members.email')}</TableHead>
              <TableHead>{t('members.role')}</TableHead>
              {canManageMembers && (
                <TableHead className="text-right">{t('members.actions')}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageMembers ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  {searchQuery
                    ? t('members.noSearchResults')
                    : teamId
                      ? t('members.noMembers')
                      : t('members.noTeam')}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.profile_id}>
                  <TableCell>
                    <Avatar>
                      <AvatarImage
                        src={member.profiles.avatar_url || ''}
                        alt={member.profiles.email || ''}
                      />
                      <AvatarFallback>{getInitials(member.profiles.email)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {member.profiles.email?.split('@')[0] || 'Unknown User'}
                  </TableCell>
                  <TableCell>{member.profiles.email || 'No email'}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(member.role)} variant="outline">
                      {member.role}
                    </Badge>
                  </TableCell>
                  {canManageMembers && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            {t('members.memberActions.changeRole')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            {t('members.memberActions.remove')}
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
