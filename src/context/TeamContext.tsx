'use client';

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// Import types and actions from server actions
import {
  ResourceType,
  Operation,
  PermissionMatrix,
  checkPermission,
  getUserPermissions,
  type PermissionsResult,
} from '@/app/actions/permission';
import {
  Team,
  getTeamById,
  getUserTeams,
  setUserActiveTeam,
  getUserActiveTeam,
} from '@/app/actions/team';
import { useUser } from '@/context/UserContext';

interface TeamContextState {
  teams: Team[];
  activeTeam: Team | null;
  permissions: PermissionMatrix[];
  loading: boolean;
  error: string | null;
  switchTeam: (teamId: string) => Promise<boolean>;
  refreshTeams: () => Promise<void>;
  checkPermission: (
    resourceType: ResourceType,
    operation: Operation,
    creatorId?: string,
  ) => Promise<boolean>;
  syncWithUserContext: () => Promise<void>;
}

const defaultState: TeamContextState = {
  teams: [],
  activeTeam: null,
  permissions: [],
  loading: true,
  error: null,
  switchTeam: async () => false,
  refreshTeams: async () => {},
  checkPermission: async () => false,
  syncWithUserContext: async () => {},
};

const TeamContext = createContext<TeamContextState>(defaultState);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    isLoading: userLoading,
    teams: userTeams,
    selectedTeam,
    setSelectedTeam,
  } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [permissions, setPermissions] = useState<PermissionMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load teams when user is loaded
  useEffect(() => {
    if (userLoading) return;

    if (user) {
      loadTeams();
    } else {
      setTeams([]);
      setActiveTeam(null);
      setPermissions([]);
      setLoading(false);
    }
  }, [user, userLoading]);

  // Load active team and permissions when teams are loaded
  useEffect(() => {
    if (!user || teams.length === 0) return;

    loadActiveTeam();
  }, [user, teams]);

  // Load team permissions when active team changes
  useEffect(() => {
    if (!user || !activeTeam) return;

    loadPermissions();
  }, [user, activeTeam]);

  // Sync the selected team from UserContext to TeamContext
  useEffect(() => {
    if (selectedTeam && (!activeTeam || selectedTeam.id !== activeTeam.id)) {
      switchTeam(selectedTeam.id);
    }
  }, [selectedTeam]);

  // Sync the active team from TeamContext to UserContext
  useEffect(() => {
    if (activeTeam && (!selectedTeam || activeTeam.id !== selectedTeam.id)) {
      setSelectedTeam(activeTeam.id);
    }
  }, [activeTeam, selectedTeam, setSelectedTeam]);

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
      const result = await getUserActiveTeam(user.id);

      if (result.success && result.data) {
        setActiveTeam(result.data);
      } else if (teams.length > 0) {
        // If no active team but teams exist, set the first one as active
        setActiveTeam(teams[0]);
        await setUserActiveTeam(user.id, teams[0].id);
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
      const result = await setUserActiveTeam(user.id, teamId);
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
  };

  const syncWithUserContext = async () => {
    if (selectedTeam && (!activeTeam || selectedTeam.id !== activeTeam.id)) {
      await switchTeam(selectedTeam.id);
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

  const value = {
    teams,
    activeTeam,
    permissions,
    loading,
    error,
    switchTeam,
    refreshTeams,
    checkPermission: checkTeamPermission,
    syncWithUserContext,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}

// Export a hook for checking permissions
export function usePermission() {
  const { activeTeam, user, checkPermission } = useTeam();

  return useCallback(
    async (resourceType: ResourceType, operation: Operation, resourceCreatorId?: string) => {
      return checkPermission(resourceType, operation, resourceCreatorId);
    },
    [activeTeam, user, checkPermission],
  );
}

export default TeamContext;
