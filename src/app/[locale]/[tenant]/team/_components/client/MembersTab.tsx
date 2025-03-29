'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { PlusIcon } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getTeamMembers, getTeamDetails } from '@/app/[locale]/[tenant]/team/actions';

interface Member {
  profile_id: string;
  role: string;
  user?: {
    name?: string;
    email?: string;
  };
}

export function MembersTab({ teamId }: { teamId: string | null }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamDetails, setTeamDetails] = useState<any>(null);

  // Check if current user is on trial tier
  const isTrialTier = !teamId || teamDetails?.subscription_tier === 'trial';

  // Get current user's profile ID
  const currentUserId = teamDetails?.ownerId;

  useEffect(() => {
    async function fetchTeamDetails() {
      try {
        const details = await getTeamDetails();
        setTeamDetails(details);
        console.log('Team details:', details);
      } catch (error) {
        console.error('Error fetching team details:', error);
      }
    }

    fetchTeamDetails();
  }, []);

  useEffect(() => {
    async function fetchMembers() {
      if (!teamId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await getTeamMembers(teamId);

        if (result.success && result.data) {
          // Process members data - add any missing fields that UI might need
          const processedMembers = result.data.map((member) => ({
            ...member,
            user: {
              name: member.profiles?.tenant_name || 'User', // Use available profile data
              email: 'Not available', // Email not directly available from profiles
              ...member.user, // Preserve any user data that might be present
            },
          }));

          setMembers(processedMembers);
          console.log('Members data fetched:', processedMembers);
        } else {
          setError(result.error || 'Failed to load team members');
          setMembers([]);
          console.error('Failed to load team members:', result.error);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        setError('Failed to load team members');
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [teamId]);

  // Log whenever members state changes
  useEffect(() => {
    console.log('Current members state:', members);
  }, [members]);

  if (!teamId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Create a team to add members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-6">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage your team members and their roles</CardDescription>
        </div>
        {!isTrialTier && (
          <Button size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-6">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center p-6 text-red-500">{error}</div>
        ) : members.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground">No team members found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {!isTrialTier && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.profile_id}>
                  <TableCell className="font-medium">{member.user?.name || 'Unknown'}</TableCell>
                  <TableCell>{member.user?.email || 'No email'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.role === 'admin'
                          ? 'default'
                          : member.role === 'developer'
                            ? 'outline'
                            : 'secondary'
                      }
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  {!isTrialTier && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      {/* Only show Remove button if not the current user */}
                      {member.profile_id !== currentUserId && (
                        <Button variant="ghost" size="sm" className="text-destructive">
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
