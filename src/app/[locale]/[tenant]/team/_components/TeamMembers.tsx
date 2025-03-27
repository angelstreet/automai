'use client';

import { useState } from 'react';
import { useTeam } from '@/context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Button } from '@/components/shadcn/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/shadcn/avatar';
import { PlusIcon, Trash2Icon, UserIcon } from 'lucide-react';
import { useToast } from '@/components/shadcn/use-toast';
import AddMemberDialog from './AddMemberDialog';

export default function TeamMembers() {
  const { selectedTeam, teamMembers, updateTeamMemberRole, removeTeamMember, loading } = useTeam();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  if (!selectedTeam) {
    return (
      <div className="text-center p-8">
        <p>Please select a team to manage members</p>
      </div>
    );
  }

  const handleRoleChange = async (profileId: string, role: string) => {
    setIsUpdating(profileId);
    
    try {
      const result = await updateTeamMemberRole(selectedTeam.id, profileId, role);
      
      if (result) {
        toast({
          title: 'Role updated',
          description: 'Team member role has been updated successfully.'
        });
      } else {
        toast({
          title: 'Failed to update role',
          description: 'An error occurred while updating the role.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveMember = async (profileId: string) => {
    setIsRemoving(profileId);
    
    try {
      const result = await removeTeamMember(selectedTeam.id, profileId);
      
      if (result) {
        toast({
          title: 'Member removed',
          description: 'Team member has been removed successfully.'
        });
      } else {
        toast({
          title: 'Failed to remove member',
          description: 'An error occurred while removing the member.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Team Members</h3>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add Member
        </Button>
      </div>
      
      {loading ? (
        <div>Loading members...</div>
      ) : teamMembers.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-muted/20">
          <UserIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">No members in this team</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.profile_id}>
                <TableCell className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {member.profiles.avatar_url ? (
                      <AvatarImage src={member.profiles.avatar_url} />
                    ) : (
                      <AvatarFallback>
                        {member.profiles.id.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>{member.profile_id}</span>
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={member.role}
                    onValueChange={(value) => handleRoleChange(member.profile_id, value)}
                    disabled={isUpdating === member.profile_id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="tester">Tester</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.profile_id)}
                    disabled={isRemoving === member.profile_id}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      <AddMemberDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        teamId={selectedTeam.id}
      />
    </div>
  );
}