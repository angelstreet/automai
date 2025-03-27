// src/context/teamContext.tsx
'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { 
  getTeams,
  getTeam,
  createTeam as createTeamAction,
  updateTeam as updateTeamAction,
  deleteTeam as deleteTeamAction,
  getTeamMembers as getTeamMembersAction,
  addTeamMember as addTeamMemberAction,
  updateTeamMemberRole as updateTeamMemberRoleAction,
  removeTeamMember as removeTeamMemberAction,
  checkResourceLimit as checkResourceLimitAction
} from '@/app/[locale]/[tenant]/team/actions';
import { useUser } from './userContext';
import type { 
  TeamContextValue, 
  Team, 
  TeamCreateInput, 
  TeamUpdateInput, 
  TeamMember, 
  TeamMemberCreateInput 
} from '@/types/context/team';

const initialState: TeamContextValue = {
  teams: [],
  selectedTeam: null,
  teamMembers: [],
  loading: false,
  error: null,
  fetchTeams: async () => {},
  createTeam: async () => null,
  updateTeam: async () => null,
  deleteTeam: async () => false,
  selectTeam: async () => {},
  fetchTeamMembers: async () => {},
  addTeamMember: async () => null,
  updateTeamMemberRole: async () => null,
  removeTeamMember: async () => false,
  checkResourceLimit: async () => null
};

const TeamContext = createContext<TeamContextValue>(initialState);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getTeams();
      
      if (result.success && result.data) {
        setTeams(result.data);
        
        // If we have teams but no selected team, select the first one
        if (result.data.length > 0 && !selectedTeam) {
          setSelectedTeam(result.data[0]);
        }
      } else {
        setError(result.error || 'Failed to fetch teams');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, selectedTeam]);

  const createTeam = useCallback(async (input: TeamCreateInput): Promise<Team | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await createTeamAction(input);
      
      if (result.success && result.data) {
        setTeams(prev => [...prev, result.data]);
        return result.data;
      } else {
        setError(result.error || 'Failed to create team');
        return null;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTeam = useCallback(async (teamId: string, input: TeamUpdateInput): Promise<Team | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateTeamAction(teamId, input);
      
      if (result.success && result.data) {
        setTeams(prev => prev.map(team => 
          team.id === teamId ? result.data : team
        ));
        
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(result.data);
        }
        
        return result.data;
      } else {
        setError(result.error || 'Failed to update team');
        return null;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  const deleteTeam = useCallback(async (teamId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await deleteTeamAction(teamId);
      
      if (result.success) {
        setTeams(prev => prev.filter(team => team.id !== teamId));
        
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(teams.find(team => team.id !== teamId) || null);
        }
        
        return true;
      } else {
        setError(result.error || 'Failed to delete team');
        return false;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, teams]);

  const selectTeam = useCallback(async (teamId: string): Promise<void> => {
    const team = teams.find(t => t.id === teamId);
    
    if (team) {
      setSelectedTeam(team);
      await fetchTeamMembers(teamId);
    }
  }, [teams]);

  const fetchTeamMembers = useCallback(async (teamId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await getTeamMembersAction(teamId);
      
      if (result.success && result.data) {
        setTeamMembers(result.data);
      } else {
        setError(result.error || 'Failed to fetch team members');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const addTeamMember = useCallback(async (input: TeamMemberCreateInput): Promise<TeamMember | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await addTeamMemberAction(input);
      
      if (result.success && result.data) {
        setTeamMembers(prev => [...prev, result.data]);
        return result.data;
      } else {
        setError(result.error || 'Failed to add team member');
        return null;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTeamMemberRole = useCallback(async (
    teamId: string, 
    profileId: string, 
    role: string
  ): Promise<TeamMember | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateTeamMemberRoleAction(teamId, profileId, role);
      
      if (result.success && result.data) {
        setTeamMembers(prev => prev.map(member => 
          member.profile_id === profileId ? result.data : member
        ));
        return result.data;
      } else {
        setError(result.error || 'Failed to update team member role');
        return null;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeTeamMember = useCallback(async (
    teamId: string, 
    profileId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await removeTeamMemberAction(teamId, profileId);
      
      if (result.success) {
        setTeamMembers(prev => prev.filter(member => member.profile_id !== profileId));
        return true;
      } else {
        setError(result.error || 'Failed to remove team member');
        return false;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkResourceLimit = useCallback(async (
    resourceType: string
  ): Promise<{ canCreate: boolean; current: number; limit: number; isUnlimited: boolean } | null> => {
    try {
      const result = await checkResourceLimitAction(resourceType);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        setError(result.error || `Failed to check ${resourceType} limit`);
        return null;
      }
    } catch (error) {
      setError('An unexpected error occurred');
      return null;
    }
  }, []);

  // Initialize teams when user changes
  useEffect(() => {
    if (user) {
      fetchTeams();
    } else {
      setTeams([]);
      setSelectedTeam(null);
      setTeamMembers([]);
    }
  }, [user, fetchTeams]);

  const value = useMemo(() => ({
    teams,
    selectedTeam,
    teamMembers,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    selectTeam,
    fetchTeamMembers,
    addTeamMember,
    updateTeamMemberRole,
    removeTeamMember,
    checkResourceLimit
  }), [
    teams,
    selectedTeam,
    teamMembers,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    selectTeam,
    fetchTeamMembers,
    addTeamMember,
    updateTeamMemberRole,
    removeTeamMember,
    checkResourceLimit
  ]);

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => useContext(TeamContext);

// src/components/layout/AppSidebar.tsx
// Add TeamSelector to the sidebar
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context';
import TeamSelector from './TeamSelector';
// ...other imports

export function AppSidebar() {
  const { user } = useUser();
  const pathname = usePathname();
  // ...other component logic

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        {/* Logo and app name */}
      </div>
      
      {/* Add TeamSelector in a prominent position */}
      <div className="px-4 py-3 border-b">
        <TeamSelector />
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {/* Navigation items */}
      </div>
      
      {/* Footer content */}
    </div>
  );
}

// src/app/[locale]/[tenant]/layout.tsx
// Add TeamProvider to the tenant layout
import { TeamProvider } from '@/context/teamContext';

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  return (
    <UserProvider>
      <TeamProvider>
        {/* Other providers */}
        <div className="flex h-screen">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </TeamProvider>
    </UserProvider>
  );
}

// src/hooks/useResourceLimit.ts
// Utility hook for checking resource limits
import { useCallback } from 'react';
import { useTeam } from '@/context';
import { useToast } from '@/components/shadcn/use-toast';

export function useResourceLimit() {
  const { checkResourceLimit } = useTeam();
  const { toast } = useToast();
  
  const checkAndNotify = useCallback(async (resourceType: string): Promise<boolean> => {
    const result = await checkResourceLimit(resourceType);
    
    if (!result) {
      toast({
        title: 'Error',
        description: 'Unable to check resource limits',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!result.canCreate) {
      toast({
        title: 'Resource Limit Reached',
        description: `You have reached your ${resourceType} limit (${result.current}/${result.limit}). Please upgrade your subscription or remove unused resources.`,
        variant: 'destructive'
      });
      return false;
    }
    
    return true;
  }, [checkResourceLimit, toast]);
  
  return { checkAndNotify };
}

// src/context/index.ts
// Update context exports to include useTeam
export { useUser } from './userContext';
export { useTeam } from './teamContext';
// ...other exports