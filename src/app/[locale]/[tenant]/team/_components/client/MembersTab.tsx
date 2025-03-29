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

  useEffect(() => {
    async function fetchMembers() {
      if (!teamId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        // In a real implementation, this would call an API endpoint
        setLoading(true);

        // Mock data for now
        setTimeout(() => {
          setMembers([
            {
              profile_id: '1',
              role: 'admin',
              user: { name: 'Alice Smith', email: 'alice@example.com' },
            },
            {
              profile_id: '2',
              role: 'developer',
              user: { name: 'Bob Johnson', email: 'bob@example.com' },
            },
            {
              profile_id: '3',
              role: 'viewer',
              user: { name: 'Carol Williams', email: 'carol@example.com' },
            },
          ]);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching members:', error);
        setLoading(false);
      }
    }

    fetchMembers();
  }, [teamId]);

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
        <Button size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-6">
            <LoadingSpinner />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground">No team members found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
