import { ReactNode } from 'react';

import { getUserTeams, getUserActiveTeam, type Team } from '@/app/actions/team';
import { getUser } from '@/app/actions/user';
import { mapAuthUserToUser } from '@/types/user';
import { User } from '@/types/auth/user';

interface TenantDataProviderProps {
  params: { tenant: string; locale: string };
  children: (userData: {
    user: User | null;
    teams: Team[];
    activeTeam: Team | null;
    tenant: string;
  }) => ReactNode;
}

interface TenantUserData {
  user: User | null;
  teams: Team[];
  activeTeam: Team | null;
  tenant: string;
}

/**
 * Server component that fetches user and team data for the tenant
 * and passes it to its children through a render prop
 */
export async function TenantDataProvider({ params, children }: TenantDataProviderProps) {
  const { tenant } = params;
  const authUser = await getUser();
  const user = authUser ? mapAuthUserToUser(authUser) : null;

  console.log('[TenantDataProvider] Fetching data for tenant:', tenant);

  // Default data if no user is logged in
  const userData: TenantUserData = {
    user,
    teams: [],
    activeTeam: null,
    tenant,
  };

  // Only fetch team data if we have a user
  if (user) {
    try {
      // Fetch teams and active team in parallel
      const [teamsResult, activeTeamResult] = await Promise.all([
        getUserTeams(user.id),
        getUserActiveTeam(user.id),
      ]);

      if (teamsResult.success && teamsResult.data) {
        // Force JSON serialization to ensure it's safe for client consumption
        const serialized = JSON.stringify(teamsResult.data);
        userData.teams = JSON.parse(serialized);
        console.log('[TenantDataProvider] Loaded teams:', userData.teams.length);
      }

      if (activeTeamResult.success && activeTeamResult.data) {
        // Force JSON serialization to ensure it's safe for client consumption
        const serialized = JSON.stringify(activeTeamResult.data);
        userData.activeTeam = JSON.parse(serialized);
        console.log('[TenantDataProvider] Loaded active team:', userData.activeTeam?.id || 'none');
      }
    } catch (error) {
      console.error('[TenantDataProvider] Error fetching team data:', error);
    }
  }

  // Call the render prop with the fetched data
  return children(userData);
}