'use client';

import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';

import {
  checkPermission,
  getUserPermissions,
} from '@/app/actions/permissionAction';
import type { 
  ResourceType,
  Operation,
  PermissionMatrix,
 } from '@/types/context/permissionsContextType';
import {
  Team,
  getTeamById,
  getUserTeams,
  setUserActiveTeam as saveUserActiveTeamToServer,
  getUserActiveTeam as fetchUserActiveTeam,
  getTeamMembers as getTeamMembersAction,
  createTeam as createTeamAction,
  updateTeam as updateTeamAction,
  deleteTeam as deleteTeamAction,
  getTeamDetails as getTeamDetailsAction,
  getUnassignedResources as getUnassignedResourcesAction,
  assignResourceToTeam as assignResourceToTeamAction,
} from '@/app/actions/teamAction';
import {
  addTeamMember,
  updateMemberPermissions,
  removeTeamMember,
  getMemberPermissions,
  applyRolePermissionTemplate,
} from '@/app/actions/teamMemberAction';
import { useToast } from '@/components/shadcn/use-toast';
import { useUser } from '@/app/providers';
import {  ResourcePermissions  } from '@/types/context/teamContextType';
import type {  TeamMember, TeamCreateInput, TeamUpdateInput  } from '@/types/context/teamContextType';

interface TeamContextState {
  teams: Team[];
  activeTeam: Team | null;
  permissions: PermissionMatrix[];
  teamMembers: Record<string, TeamMember[]>;
  teamDetails: any | null;
  loading: boolean;
  membersLoading: boolean;
  error: string | null;

  // Team management
  switchTeam: (teamId: string) => Promise<boolean>;
  refreshTeams: () => Promise<void>;
  createTeam: (data: TeamCreateInput) => Promise<{ success: boolean; data?: Team; error?: string }>;
  updateTeam: (
    teamId: string,
    data: TeamUpdateInput,
  ) => Promise<{ success: boolean; data?: Team; error?: string }>;
  deleteTeam: (teamId: string) => Promise<{ success: boolean; error?: string }>;
  getTeamById: (teamId: string) => Promise<Team | null>;
  getTeamDetails: (userId?: string) => Promise<any>;
  getUnassignedResources: () => Promise<any>;
  assignResourceToTeam: (resourceId: string, resourceType: string, teamId: string) => Promise<any>;

  // Permission management
  checkPermission: (
    resourceType: ResourceType,
    operation: Operation,
    creatorId?: string,
  ) => Promise<boolean>;

  // Team member management
  getTeamMembers: (teamId: string) => Promise<TeamMember[]>;
  invalidateTeamMembersCache: (teamId: string) => void;
  addTeamMember: (
    teamId: string,
    email: string,
    role: string,
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  removeTeamMember: (
    teamId: string,
    profileId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateMemberPermissions: (
    teamId: string,
    profileId: string,
    permissions: ResourcePermissions,
  ) => Promise<{ success: boolean; error?: string }>;
  applyRoleTemplate: (
    teamId: string,
    profileId: string,
    role: string,
  ) => Promise<{ success: boolean; error?: string }>;
  getMemberPermissions: (
    teamId: string,
    profileId: string,
  ) => Promise<{ success: boolean; error?: string; data?: ResourcePermissions }>;
}

const defaultState: TeamContextState = {
  teams: [],
  activeTeam: null,
  permissions: [],
  teamMembers: {},
  teamDetails: null,
  loading: true,
  membersLoading: false,
  error: null,
  switchTeam: async () => false,
  refreshTeams: async () => {},
  createTeam: async () => ({ success: false }),
  updateTeam: async () => ({ success: false }),
  deleteTeam: async () => ({ success: false }),
  getTeamById: async () => null,
  getTeamDetails: async () => null,
  getUnassignedResources: async () => ({}),
  assignResourceToTeam: async () => ({ success: false }),
  checkPermission: async () => false,
  getTeamMembers: async () => [],
  invalidateTeamMembersCache: () => {},
  addTeamMember: async () => ({ success: false }),
  removeTeamMember: async () => ({ success: false }),
  updateMemberPermissions: async () => ({ success: false }),
  applyRoleTemplate: async () => ({ success: false }),
  getMemberPermissions: async () => ({ success: false }),
};

const TeamContext = createContext<TeamContextState>(defaultState);

interface TeamProviderProps {
  children: React.ReactNode;
  initialTeams?: Team[];
  initialActiveTeam?: Team | null;
}

export function TeamProvider({
  children,
  initialTeams = [],
  initialActiveTeam = null,
}: TeamProviderProps) {
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [activeTeam, setActiveTeam] = useState<Team | null>(initialActiveTeam);
  const [permissions, setPermissions] = useState<PermissionMatrix[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [teamDetails, setTeamDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(!initialTeams.length && !initialActiveTeam);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add loading timestamps to prevent frequent refetching
  const lastTeamLoadTime = useRef<Record<string, number>>({});
  const lastMembersLoadTime = useRef<Record<string, number>>({});
  const lastTeamDetailsTime = useRef<Record<string, number>>({});

  // Only load teams if we don't have initialTeams and user is loaded
  const loadTeams = useCallback(async () => {
    if (!user) return;

    // Skip if we've loaded teams in the last 30 seconds
    const now = Date.now();
    if (
      lastTeamLoadTime.current.teams &&
      now - lastTeamLoadTime.current.teams < 30000 &&
      teams.length > 0
    ) {
      console.log('[@context:team:loadTeams] Using cached teams data (loaded within last 30s)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getUserTeams(user.id);
      if (result.success && result.data) {
        setTeams(result.data);
        lastTeamLoadTime.current.teams = now;
      } else {
        setError(result.error || 'Failed to load teams');
      }
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [user, teams.length]);

  const loadActiveTeam = useCallback(async () => {
    if (!user) return;

    // Skip if we've loaded the active team in the last 30 seconds
    const now = Date.now();
    if (
      lastTeamLoadTime.current.activeTeam &&
      now - lastTeamLoadTime.current.activeTeam < 30000 &&
      activeTeam
    ) {
      console.log(
        '[@context:team:loadActiveTeam] Using cached active team (loaded within last 30s)',
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchUserActiveTeam(user.id);

      if (result.success && result.data) {
        setActiveTeam(result.data);
        lastTeamLoadTime.current.activeTeam = now;
      } else if (teams.length > 0) {
        // If no active team but teams exist, set the first one as active
        setActiveTeam(teams[0]);
        await saveUserActiveTeamToServer(user.id, teams[0].id);
        lastTeamLoadTime.current.activeTeam = now;
      } else {
        setError('No teams available');
      }
    } catch (err) {
      console.error('Error loading active team:', err);
      setError('Failed to load active team');
    } finally {
      setLoading(false);
    }
  }, [user, teams, activeTeam]);

  const loadPermissions = useCallback(async () => {
    if (!user || !activeTeam) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getUserPermissions(user.id, activeTeam.id);
      if (result.success && result.data) {
        setPermissions(result.data);
      } else {
        setError(result.error || 'Failed to load permissions');
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [user, activeTeam]);

  useEffect(() => {
    if (userLoading) return;

    // Only fetch if we don't have initial data and user exists
    if (user && !initialTeams.length) {
      loadTeams();
    } else if (!user) {
      // Reset state if no user
      setTeams([]);
      setActiveTeam(null);
      setPermissions([]);
      setTeamMembers({});
      setTeamDetails(null);
      setLoading(false);
    }
  }, [user, userLoading, initialTeams.length, loadTeams]);

  // Load active team only if needed
  useEffect(() => {
    if (!user || teams.length === 0) return;

    // Skip loading if we already have an active team
    if (activeTeam) return;

    loadActiveTeam();
  }, [user, teams, activeTeam, loadActiveTeam]);

  // Load team permissions when active team changes
  useEffect(() => {
    if (!user || !activeTeam) return;

    loadPermissions();
  }, [user, activeTeam, loadPermissions]);

  // Team Management Functions

  const switchTeam = async (teamId: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    setError(null);

    try {
      // Verify team exists and user is a member
      const teamResult = await getTeamById(teamId);
      if (!teamResult.success || !teamResult.data) {
        setError('Team not found');
        return false;
      }

      // Set active team in user profile
      const result = await saveUserActiveTeamToServer(user.id, teamId);
      if (result.success) {
        setActiveTeam(teamResult.data);

        // Update the last load time for active team
        lastTeamLoadTime.current.activeTeam = Date.now();

        await loadPermissions();
        return true;
      } else {
        setError(result.error || 'Failed to switch team');
        return false;
      }
    } catch (err) {
      console.error('Error switching team:', err);
      setError('Failed to switch team');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshTeams = async () => {
    await loadTeams();
    if (teams.length > 0 && !activeTeam) {
      await loadActiveTeam();
    }
  };

  const getTeamByIdFromContext = async (teamId: string): Promise<Team | null> => {
    try {
      const result = await getTeamById(teamId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('[@context:team] Error fetching team:', error);
      return null;
    }
  };

  const createTeamInContext = async (data: TeamCreateInput) => {
    try {
      const result = await createTeamAction(data);
      if (result.success && result.data) {
        // Update teams list in state
        setTeams((prev) => [...prev, result.data!]);
        // Invalidate cache
        lastTeamLoadTime.current.teams = 0;

        toast({
          title: 'Success',
          description: 'Team created successfully',
        });

        return result;
      }

      toast({
        title: 'Error',
        description: result.error || 'Failed to create team',
        variant: 'destructive',
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[@context:team] Error creating team:', error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  };

  const updateTeamInContext = async (teamId: string, data: TeamUpdateInput) => {
    try {
      const result = await updateTeamAction(teamId, data);
      if (result.success && result.data) {
        // Update teams list in state
        setTeams((prev) => prev.map((team) => (team.id === teamId ? result.data! : team)));

        // If active team was updated, update it too
        if (activeTeam && activeTeam.id === teamId) {
          setActiveTeam(result.data);
        }

        // Invalidate cache
        lastTeamLoadTime.current.teams = 0;

        toast({
          title: 'Success',
          description: 'Team updated successfully',
        });

        return result;
      }

      toast({
        title: 'Error',
        description: result.error || 'Failed to update team',
        variant: 'destructive',
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[@context:team] Error updating team:', error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  };

  const deleteTeamInContext = async (teamId: string) => {
    try {
      const result = await deleteTeamAction(teamId);
      if (result.success) {
        // Remove team from state
        setTeams((prev) => prev.filter((team) => team.id !== teamId));

        // If active team was deleted, reset active team
        if (activeTeam && activeTeam.id === teamId) {
          setActiveTeam(null);
        }

        // Invalidate cache
        lastTeamLoadTime.current.teams = 0;

        toast({
          title: 'Success',
          description: 'Team deleted successfully',
        });

        return result;
      }

      toast({
        title: 'Error',
        description: result.error || 'Failed to delete team',
        variant: 'destructive',
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[@context:team] Error deleting team:', error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  };

  const getTeamDetailsFromContext = async (userId?: string) => {
    const cacheKey = userId || 'current';
    const now = Date.now();

    // Return cached data if available and still fresh (less than 1 minute old)
    if (
      teamDetails &&
      lastTeamDetailsTime.current[cacheKey] &&
      now - lastTeamDetailsTime.current[cacheKey] < 60000
    ) {
      console.log('[@context:team] Using cached team details (loaded within last 60s)');
      return teamDetails;
    }

    try {
      setLoading(true);
      const details = await getTeamDetailsAction(userId);
      setTeamDetails(details);
      lastTeamDetailsTime.current[cacheKey] = now;
      return details;
    } catch (error) {
      console.error('[@context:team] Error fetching team details:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getUnassignedResourcesFromContext = async () => {
    try {
      return await getUnassignedResourcesAction();
    } catch (error) {
      console.error('[@context:team] Error fetching unassigned resources:', error);
      return { repositories: [] };
    }
  };

  const assignResourceToTeamFromContext = async (
    resourceId: string,
    resourceType: string,
    teamId: string,
  ) => {
    try {
      return await assignResourceToTeamAction(resourceId, resourceType, teamId);
    } catch (error) {
      console.error('[@context:team] Error assigning resource to team:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  };

  // Use the checkPermission server action
  const checkTeamPermission = useCallback(
    async (resourceType: ResourceType, operation: Operation, creatorId?: string) => {
      if (!user || !activeTeam) return false;

      try {
        return await checkPermission(user.id, activeTeam.id, resourceType, operation, creatorId);
      } catch (err) {
        console.error('Error checking permission:', err);
        return false;
      }
    },
    [user, activeTeam],
  );

  // Get team members with caching
  const getTeamMembersFromContext = useCallback(
    async (teamId: string): Promise<TeamMember[]> => {
      if (!teamId) return [];

      const now = Date.now();

      // Return cached data if available
      if (teamMembers[teamId]) {
        // If we've fetched within the last 60 seconds, don't refetch
        if (
          lastMembersLoadTime.current[teamId] &&
          now - lastMembersLoadTime.current[teamId] < 60000
        ) {
          console.log(
            `[@context:team] Using cached team members for team ${teamId} (loaded within last 60s)`,
          );
          return teamMembers[teamId];
        }
      }

      // Otherwise fetch data
      try {
        console.log(`[@context:team] Fetching team members for team ${teamId}`);
        setMembersLoading(true);
        const result = await getTeamMembersAction(teamId);
        if (result.success && result.data) {
          // Cache the result
          setTeamMembers((prev) => {
            const newMembers = { ...prev };
            newMembers[teamId] = result.data as TeamMember[];
            return newMembers;
          });

          // Update the last load time
          lastMembersLoadTime.current[teamId] = now;

          return result.data as TeamMember[];
        }
        return [];
      } catch (error) {
        console.error('[@context:team] Error fetching team members:', error);
        return [];
      } finally {
        setMembersLoading(false);
      }
    },
    [teamMembers],
  );

  // Function to invalidate team members cache for a specific team
  const invalidateTeamMembersCache = useCallback((teamId: string) => {
    console.log(`[@context:team] Invalidating team members cache for team ${teamId}`);
    setTeamMembers((prev) => {
      const newMembers = { ...prev };
      delete newMembers[teamId];
      return newMembers;
    });

    // Also remove the last load time entry
    if (lastMembersLoadTime.current[teamId]) {
      delete lastMembersLoadTime.current[teamId];
    }
  }, []);

  // Team member functions

  const addTeamMemberToContext = async (teamId: string, email: string, role: string) => {
    try {
      const result = await addTeamMember(teamId, email, role);

      if (result.success) {
        // Invalidate team members cache for this team
        invalidateTeamMembersCache(teamId);

        toast({
          title: 'Success',
          description: 'Team member added successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add team member',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[@context:team] Error adding team member:', error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  };

  const removeTeamMemberFromContext = async (teamId: string, profileId: string) => {
    try {
      const result = await removeTeamMember(teamId, profileId);

      if (result.success) {
        // Invalidate team members cache for this team
        invalidateTeamMembersCache(teamId);

        toast({
          title: 'Success',
          description: 'Team member removed successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove team member',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[@context:team] Error removing team member:', error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  };

  const updateMemberPermissionsInContext = async (
    teamId: string,
    profileId: string,
    permissions: ResourcePermissions,
  ) => {
    try {
      const result = await updateMemberPermissions(teamId, profileId, permissions);

      if (result.success) {
        // Invalidate team members cache for this team
        invalidateTeamMembersCache(teamId);

        toast({
          title: 'Success',
          description: 'Permissions updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update permissions',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[@context:team] Error updating member permissions:', error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  };

  const applyRoleTemplateInContext = async (teamId: string, profileId: string, role: string) => {
    try {
      const result = await applyRolePermissionTemplate(teamId, profileId, role);

      if (result.success) {
        // Invalidate team members cache for this team
        invalidateTeamMembersCache(teamId);

        toast({
          title: 'Success',
          description: 'Role template applied successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to apply role template',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[@context:team] Error applying role template:', error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  };

  const getMemberPermissionsFromContext = async (teamId: string, profileId: string) => {
    try {
      return await getMemberPermissions(teamId, profileId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[@context:team] Error getting member permissions:', error);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    teams,
    activeTeam,
    permissions,
    teamMembers,
    teamDetails,
    loading,
    membersLoading,
    error,

    // Team management
    switchTeam,
    refreshTeams,
    createTeam: createTeamInContext,
    updateTeam: updateTeamInContext,
    deleteTeam: deleteTeamInContext,
    getTeamById: getTeamByIdFromContext,
    getTeamDetails: getTeamDetailsFromContext,
    getUnassignedResources: getUnassignedResourcesFromContext,
    assignResourceToTeam: assignResourceToTeamFromContext,

    // Permission management
    checkPermission: checkTeamPermission,

    // Team member management
    getTeamMembers: getTeamMembersFromContext,
    invalidateTeamMembersCache,
    addTeamMember: addTeamMemberToContext,
    removeTeamMember: removeTeamMemberFromContext,
    updateMemberPermissions: updateMemberPermissionsInContext,
    applyRoleTemplate: applyRoleTemplateInContext,
    getMemberPermissions: getMemberPermissionsFromContext,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

// @ts-ignore - Ignore fast refresh warning
export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
}

// @ts-ignore - Ignore fast refresh warning
export function usePermission() {
  const { checkPermission } = useContext(TeamContext);
  return { checkPermission };
}

/**
 * Hook for team creation functionality
 */
// @ts-ignore - Ignore fast refresh warning
export function useTeamCreation() {
  const { createTeam, loading } = useTeam();
  const [error, setError] = useState<string | null>(null);

  const createNewTeam = async (data: TeamCreateInput) => {
    setError(null);
    try {
      const result = await createTeam(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    createTeam: createNewTeam,
    isLoading: loading,
    error,
  };
}

/**
 * Hook for team update functionality
 */
// @ts-ignore - Ignore fast refresh warning
export function useTeamUpdate() {
  const { updateTeam, loading } = useTeam();
  const [error, setError] = useState<string | null>(null);

  const updateExistingTeam = async (teamId: string, data: TeamUpdateInput) => {
    setError(null);
    try {
      const result = await updateTeam(teamId, data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    updateTeam: updateExistingTeam,
    isLoading: loading,
    error,
  };
}

/**
 * Hook for team deletion functionality
 */
// @ts-ignore - Ignore fast refresh warning
export function useTeamDeletion() {
  const { deleteTeam, loading } = useTeam();
  const [error, setError] = useState<string | null>(null);

  const deleteExistingTeam = async (teamId: string) => {
    setError(null);
    try {
      const result = await deleteTeam(teamId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    deleteTeam: deleteExistingTeam,
    isLoading: loading,
    error,
  };
}

/**
 * Hook for team details with automatic fetching
 */
// @ts-ignore - Ignore fast refresh warning
export function useTeamDetails(userId?: string) {
  const { getTeamDetails, loading } = useTeam();
  const [details, setDetails] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      setError(null);
      try {
        const result = await getTeamDetails(userId);
        setDetails(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      }
    }

    fetchDetails();
  }, [getTeamDetails, userId]);

  return {
    details,
    isLoading: loading,
    error,
    refetch: async () => {
      setError(null);
      try {
        const result = await getTeamDetails(userId);
        setDetails(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        return null;
      }
    },
  };
}

/**
 * Hook for getting unassigned resources
 */
// @ts-ignore - Ignore fast refresh warning
export function useUnassignedResources() {
  const { getUnassignedResources, loading } = useTeam();
  const [resources, setResources] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResources() {
      setError(null);
      try {
        const result = await getUnassignedResources();
        setResources(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      }
    }

    fetchResources();
  }, [getUnassignedResources]);

  return {
    resources,
    isLoading: loading,
    error,
    refetch: async () => {
      setError(null);
      try {
        const result = await getUnassignedResources();
        setResources(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        return null;
      }
    },
  };
}

/**
 * Hook for team switching functionality
 */
// @ts-ignore - Ignore fast refresh warning
export function useTeamSwitcher() {
  const { switchTeam, activeTeam, teams, loading } = useTeam();
  const [error, setError] = useState<string | null>(null);

  const switchToTeam = async (teamId: string) => {
    setError(null);
    try {
      const result = await switchTeam(teamId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  };

  return {
    switchTeam: switchToTeam,
    activeTeam,
    availableTeams: teams,
    isLoading: loading,
    error,
  };
}

// Simplified useTeamMember hook that now uses the context functions
// @ts-ignore - Ignore fast refresh warning
export function useTeamMember({
  teamId,
  onSuccess,
}: {
  teamId: string | null;
  onSuccess?: () => void;
}) {
  const {
    addTeamMember,
    removeTeamMember,
    updateMemberPermissions,
    applyRoleTemplate: applyRole,
    getMemberPermissions,
    membersLoading: isLoading,
  } = useTeam();
  const [error, setError] = useState<string | null>(null);

  const addMember = async (email: string, role: string) => {
    if (!teamId) {
      setError('Team ID is required');
      return false;
    }

    setError(null);
    try {
      const result = await addTeamMember(teamId, email, role);

      if (result.success && onSuccess) {
        onSuccess();
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  };

  const removeMember = async (profileId: string) => {
    if (!teamId) {
      setError('Team ID is required');
      return false;
    }

    setError(null);
    try {
      const result = await removeTeamMember(teamId, profileId);

      if (result.success && onSuccess) {
        onSuccess();
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  };

  const updatePermissions = async (profileId: string, permissions: ResourcePermissions) => {
    if (!teamId) {
      setError('Team ID is required');
      return false;
    }

    setError(null);
    try {
      const result = await updateMemberPermissions(teamId, profileId, permissions);

      if (result.success && onSuccess) {
        onSuccess();
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  };

  const applyRoleTemplate = async (profileId: string, role: string) => {
    if (!teamId) {
      setError('Team ID is required');
      return false;
    }

    setError(null);
    try {
      const result = await applyRole(teamId, profileId, role);

      if (result.success && onSuccess) {
        onSuccess();
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  };

  const getPermissions = async (profileId: string) => {
    if (!teamId) {
      setError('Team ID is required');
      return null;
    }

    setError(null);
    try {
      const result = await getMemberPermissions(teamId, profileId);

      if (result.success && result.data) {
        return result.data;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return null;
    }
  };

  return {
    addMember,
    updatePermissions,
    applyRoleTemplate,
    removeMember,
    getPermissions,
    isLoading,
    error,
  };
}
