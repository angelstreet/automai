'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addTeamMember as addTeamMemberAction,
  removeTeamMember as removeTeamMemberAction,
  updateTeamMemberRole,
} from '@/app/actions/teamMemberAction';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/shadcn/use-toast';

/**
 * Hook for adding a team member
 */
export function useAddTeamMember() {
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
      const result = await addTeamMemberAction({
        team_id: teamId,
        profile_id: profileId,
        role,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add team member');
      }
      return { teamId, result };
    },
    onSuccess: ({ teamId }) => {
      // Invalidate team members query
      queryClient.invalidateQueries({ queryKey: ['teamMembers', teamId] });

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
