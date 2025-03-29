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

  // Fetch team details and members in a single effect to reduce unnecessary rerenders
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);

        // First get team details
        const details = await getTeamDetails();

        if (!isMounted) return;
        setTeamDetails(details);

        // If we have a teamId, fetch team members
        if (teamId) {
          const result = await getTeamMembers(teamId);

          if (!isMounted) return;

          if (result.success && result.data) {
            // Process member data with owner email if available
            const processedMembers = result.data.map((member) => {
              if (details?.ownerId === member.profile_id && details?.ownerEmail) {
                return {
                  ...member,
                  user: {
                    ...member.user,
                    email: details.ownerEmail,
                  },
                };
              }
              return member;
            });

            setMembers(processedMembers);
            setError(null);
          } else {
            setError(result.error || 'Failed to load team members');
            setMembers([]);
          }
        } else {
          setMembers([]);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching data:', error);
        setError('Failed to load team data');
        setMembers([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    // Cleanup function to handle component unmounting
    return () => {
      isMounted = false;
    };
  }, [teamId]); // Only depend on teamId to prevent unnecessary fetches

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
