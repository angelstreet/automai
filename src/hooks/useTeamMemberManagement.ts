'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import {
  addTeamMember as addTeamMemberAction,
  addMultipleTeamMembers as addMultipleTeamMembersAction,
  getAvailableTenantProfiles as getAvailableTenantProfilesAction,
  removeTeamMember as removeTeamMemberAction,
  updateTeamMemberRole,
  inviteTeamMemberByEmail as inviteTeamMemberByEmailAction,
} from '@/app/actions/teamMemberAction';
import { useToast } from '@/components/shadcn/use-toast';

/**
 * Hook for getting available tenant profiles that can be added to a team
 */
export function useAvailableTenantProfiles(tenantId: string, teamId: string) {
  return useQuery({
    queryKey: ['availableTenantProfiles', tenantId, teamId],
    queryFn: async () => {
      if (!tenantId || !teamId) {
        throw new Error('Tenant ID and Team ID are required');
      }

      const result = await getAvailableTenantProfilesAction(tenantId, teamId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch available tenant profiles');
      }

      return result.data;
    },
    enabled: !!tenantId && !!teamId,
  });
}

/**
 * Hook for adding a team member
 */
export function useAddTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      teamId,
      email,
      role,
    }: {
      teamId: string;
      email: string;
      role: string;
    }) => {
      const result = await addTeamMemberAction(teamId, email, role);

      if (!result.success) {
        throw new Error(result.error || 'Failed to add team member');
      }
      return { teamId, result };
    },
    onSuccess: ({ teamId }) => {
      // Invalidate team members query
      queryClient.invalidateQueries({ queryKey: ['teamMembers', teamId] });
      // Also invalidate available tenant profiles
      queryClient.invalidateQueries({ queryKey: ['availableTenantProfiles'] });

      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add team member',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for adding multiple team members at once
 */
export function useAddMultipleTeamMembers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      teamId,
      profileIds,
      role,
    }: {
      teamId: string;
      profileIds: string[];
      role: string;
    }) => {
      const result = await addMultipleTeamMembersAction(teamId, profileIds, role);

      if (!result.success) {
        throw new Error(result.error || 'Failed to add team members');
      }
      return { teamId, count: result.data?.count || 0 };
    },
    onSuccess: ({ teamId, count }) => {
      // Invalidate team members query
      queryClient.invalidateQueries({ queryKey: ['teamMembers', teamId] });
      // Also invalidate available tenant profiles
      queryClient.invalidateQueries({ queryKey: ['availableTenantProfiles'] });

      toast({
        title: 'Success',
        description: `${count} team member(s) added successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add team members',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for removing a team member
 */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ teamId, profileId }: { teamId: string; profileId: string }) => {
      const result = await removeTeamMemberAction(teamId, profileId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove team member');
      }
      return { teamId, profileId };
    },
    onSuccess: ({ teamId }) => {
      // Invalidate team members query
      queryClient.invalidateQueries({ queryKey: ['teamMembers', teamId] });

      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove team member',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for updating team member role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      teamId,
      profileId,
      role,
    }: {
      teamId: string;
      profileId: string;
      role: string;
    }) => {
      return { teamId, profileId };
      //TODO : remove this once the action is implemented
      const result = await updateTeamMemberRole(teamId, profileId, role);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update role');
      }
      return { teamId, profileId };
    },
    onSuccess: ({ teamId }) => {
      // Invalidate team members query
      queryClient.invalidateQueries({ queryKey: ['teamMembers', teamId] });

      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for inviting a user by email to join a team
 */
export function useInviteTeamMemberByEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      teamId,
      email,
      role,
    }: {
      teamId: string;
      email: string;
      role: string;
    }) => {
      const result = await inviteTeamMemberByEmailAction(teamId, email, role);

      if (!result.success) {
        throw new Error(result.error || 'Failed to invite team member');
      }
      return { teamId, result };
    },
    onSuccess: ({ teamId, result }) => {
      // Invalidate team members query
      queryClient.invalidateQueries({ queryKey: ['teamMembers', teamId] });

      if (result.data?.added) {
        toast({
          title: 'Success',
          description: 'User added to the team successfully',
        });
      } else {
        toast({
          title: 'Invitation Sent',
          description: 'Invitation has been sent to the provided email',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: 'destructive',
      });
    },
  });
}
