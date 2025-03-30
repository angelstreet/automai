'use client';

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// Import types and actions from server actions
import {
  ResourceType,
  Operation,
  PermissionMatrix,
  checkPermission,
  getUserPermissions,
} from '@/app/actions/permission';
import {
  Team,
  getTeamById,
  getUserTeams,
  setUserActiveTeam as saveUserActiveTeamToServer,
  getUserActiveTeam as fetchUserActiveTeam,
  getTeamMembers as getTeamMembersAction,
} from '@/app/actions/team';
import { useUser } from '@/context/UserContext';
import type { TeamMember } from '@/types/context/team';

interface TeamContextState {
  teams: Team[];
  activeTeam: Team | null;
  permissions: PermissionMatrix[];
  teamMembers: Record<string, TeamMember[]>;
  loading: boolean;
  error: string | null;
  switchTeam: (teamId: string) => Promise<boolean>;
  refreshTeams: () => Promise<void>;
  checkPermission: (
    resourceType: ResourceType,
    operation: Operation,
    creatorId?: string,
  ) => Promise<boolean>;
  getTeamMembers: (teamId: string) => Promise<TeamMember[]>;
  invalidateTeamMembersCache: (teamId: string) => void;
}

const defaultState: TeamContextState = {
  teams: [],
  activeTeam: null,
  permissions: [],
  teamMembers: {},
  loading: true,
  error: null,
  switchTeam: async () => false,
  refreshTeams: async () => {},
  checkPermission: async () => false,
  getTeamMembers: async () => [],
  invalidateTeamMembersCache: () => {},
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
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [activeTeam, setActiveTeam] = useState<Team | null>(initialActiveTeam);
  const [permissions, setPermissions] = useState<PermissionMatrix[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [loading, setLoading] = useState(!initialTeams.length && !initialActiveTeam);
  const [error, setError] = useState<string | null>(null);

  // Only load teams if we don't have initialTeams and user is loaded
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
      setLoading(false);
    }
  }, [user, userLoading, initialTeams.length]);

  // Load active team only if needed
  useEffect(() => {
    if (!user || teams.length === 0) return;

    // Skip loading if we already have an active team
    if (activeTeam) return;

    loadActiveTeam();
  }, [user, teams, activeTeam]);

  // Load team permissions when active team changes
  useEffect(() => {
    if (!user || !activeTeam) return;

    loadPermissions();
  }, [user, activeTeam]);

  const loadTeams = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getUserTeams(user.id);
      if (result.success && result.data) {
        setTeams(result.data);
      } else {
        setError(result.error || 'Failed to load teams');
      }
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTeam = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchUserActiveTeam(user.id);

      if (result.success && result.data) {
        setActiveTeam(result.data);
      } else if (teams.length > 0) {
        // If no active team but teams exist, set the first one as active
        setActiveTeam(teams[0]);
        await saveUserActiveTeamToServer(user.id, teams[0].id);
      } else {
        setError('No teams available');
      }
    } catch (err) {
      console.error('Error loading active team:', err);
      setError('Failed to load active team');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
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
  };

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

      // Return cached data if available
      if (teamMembers[teamId]) {
        console.log(`[@context:team] Using cached team members for team ${teamId}`);
        return teamMembers[teamId];
      }

      // Otherwise fetch data
      try {
        console.log(`[@context:team] Fetching team members for team ${teamId}`);
        setLoading(true); // Set loading state when fetching
        const result = await getTeamMembersAction(teamId);
        if (result.success && result.data) {
          // Cache the result
          setTeamMembers((prev) => {
            const newMembers = { ...prev };
            newMembers[teamId] = result.data as TeamMember[];
            return newMembers;
          });
          return result.data as TeamMember[];
        }
        return [];
      } catch (error) {
        console.error('[@context:team] Error fetching team members:', error);
        return [];
      } finally {
        setLoading(false); // Clear loading state after fetch completes
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
  }, []);

  const value = {
    teams,
    activeTeam,
    permissions,
    teamMembers,
    loading,
    error,
    switchTeam,
    refreshTeams,
    checkPermission: checkTeamPermission,
    getTeamMembers: getTeamMembersFromContext,
    invalidateTeamMembersCache,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
}

export function usePermission() {
  const { checkPermission } = useContext(TeamContext);
  return { checkPermission };
}
