// src/app/[locale]/[tenant]/team/_components/CreateTeamDialog.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Button } from '@/components/shadcn/button';
import { Textarea } from '@/components/shadcn/textarea';
import { Checkbox } from '@/components/shadcn/checkbox';
import { useTeam } from '@/context';
import { useToast } from '@/components/shadcn/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  is_default: z.boolean().default(false)
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const { createTeam, teams } = useTeam();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      is_default: false
    }
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const team = await createTeam({
        name: values.name,
        description: values.description || undefined,
        is_default: values.is_default
      });
      
      if (team) {
        toast({
          title: 'Team created',
          description: `${values.name} team has been created successfully.`
        });
        
        onOpenChange(false);
        form.reset();
      } else {
        toast({
          title: 'Failed to create team',
          description: 'An error occurred while creating the team.',
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
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize users and resources.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter team name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter team description" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={teams.some(team => team.is_default)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Set as default team
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Default team is used for new users and resources.
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// src/app/[locale]/[tenant]/team/_components/TeamList.tsx
'use client';

import { useState } from 'react';
import { useTeam } from '@/context';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { PlusIcon, UserIcon, UsersIcon } from 'lucide-react';
import { CreateTeamDialog } from './CreateTeamDialog';

export function TeamList() {
  const { teams, selectedTeam, selectTeam, loading, error } = useTeam();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (loading) {
    return <div>Loading teams...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teams</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" /> New Team
        </Button>
      </div>
      
      {teams.length === 0 ? (
        <div className="text-center p-8">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No teams found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a team to better organize your resources.
          </p>
          <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
            Create Team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card 
              key={team.id} 
              className={`cursor-pointer ${selectedTeam?.id === team.id ? 'border-primary' : ''}`}
              onClick={() => selectTeam(team.id)}
            >
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>
                  {team.is_default ? 'Default Team' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {team.description || 'No description provided'}
                </p>
              </CardContent>
              <CardFooter>
                <div className="flex items-center text-sm text-gray-500">
                  <UserIcon className="mr-1 h-4 w-4" />
                  <span>Members</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <CreateTeamDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
    </div>
  );
}

// src/app/[locale]/[tenant]/team/_components/TeamMembers.tsx
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
import { AddMemberDialog } from './AddMemberDialog';

export function TeamMembers() {
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

// src/app/[locale]/[tenant]/team/_components/AddMemberDialog.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/shadcn/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Input } from '@/components/shadcn/input';
import { Button } from '@/components/shadcn/button';
import { useTeam } from '@/context';
import { useToast } from '@/components/shadcn/use-toast';

const formSchema = z.object({
  profile_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['viewer', 'tester', 'developer', 'admin']),
});

type FormValues = z.infer<typeof formSchema>;

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export function AddMemberDialog({ open, onOpenChange, teamId }: AddMemberDialogProps) {
  const { addTeamMember } = useTeam();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profile_id: '',
      role: 'viewer',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const result = await addTeamMember({
        team_id: teamId,
        profile_id: values.profile_id,
        role: values.role,
      });
      
      if (result) {
        toast({
          title: 'Member added',
          description: 'Team member has been added successfully.'
        });
        
        onOpenChange(false);
        form.reset();
      } else {
        toast({
          title: 'Failed to add member',
          description: 'An error occurred while adding the member.',
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
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a user to this team and assign a role.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="profile_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter user UUID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="tester">Tester</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// src/app/[locale]/[tenant]/team/_components/ResourceLimits.tsx
'use client';

import { useEffect, useState } from 'react';
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
import { Progress } from '@/components/shadcn/progress';
import { useTeam } from '@/context';
import { useUser } from '@/context';

interface ResourceLimit {
  type: string;
  current: number;
  limit: number;
  isUnlimited: boolean;
}

export function ResourceLimits() {
  const { user } = useUser();
  const { checkResourceLimit } = useTeam();
  const [limits, setLimits] = useState<ResourceLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resourceTypes = ['hosts', 'repositories', 'deployments', 'cicd_providers'];
  const resourceNames = {
    hosts: 'Hosts',
    repositories: 'Repositories',
    deployments: 'Deployments',
    cicd_providers: 'CI/CD Providers'
  };

  useEffect(() => {
    const fetchLimits = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const results = await Promise.all(
          resourceTypes.map(async (type) => {
            const result = await checkResourceLimit(type);
            return {
              type,
              ...(result || { current: 0, limit: 0, isUnlimited: false, canCreate: false })
            };
          })
        );
        
        setLimits(results.filter(Boolean));
      } catch (err) {
        setError('Failed to load resource limits');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLimits();
  }, [user]);

  if (loading) {
    return <div>Loading resource limits...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Limits</CardTitle>
        <CardDescription>
          Current usage and limits for your subscription tier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Resource Type</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {limits.map((resource) => (
              <TableRow key={resource.type}>
                <TableCell className="font-medium">
                  {resourceNames[resource.type as keyof typeof resourceNames] || resource.type}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs">
                      <span>
                        {resource.current} / {resource.isUnlimited ? 'Unlimited' : resource.limit}
                      </span>
                      <span className={resource.current >= resource.limit && !resource.isUnlimited ? 'text-red-500' : ''}>
                        {resource.isUnlimited 
                          ? '∞' 
                          : `${Math.min(Math.round((resource.current / resource.limit) * 100), 100)}%`}
                      </span>
                    </div>
                    <Progress 
                      value={resource.isUnlimited ? 10 : Math.min((resource.current / resource.limit) * 100, 100)}
                      className={resource.current >= resource.limit && !resource.isUnlimited ? 'text-red-500' : ''}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {resource.isUnlimited ? (
                    <span className="text-green-500">Unlimited</span>
                  ) : resource.current >= resource.limit ? (
                    <span className="text-red-500">Limit Reached</span>
                  ) : (
                    <span className="text-green-500">Available</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// src/app/[locale]/[tenant]/team/_components/index.ts
export { CreateTeamDialog } from './CreateTeamDialog';
export { TeamList } from './TeamList';
export { TeamMembers } from './TeamMembers';
export { AddMemberDialog } from './AddMemberDialog';
export { ResourceLimits } from './ResourceLimits';
export { default as TeamPageContent } from './TeamPageContent';