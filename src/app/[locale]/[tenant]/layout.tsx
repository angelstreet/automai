import { getUserPermissions } from '@/app/actions/permissionAction';
import { getActiveTeamDetails, getUserTeams } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import { TooltipProvider } from '@/components/shadcn/tooltip';
import { Team } from '@/types/context/teamContextType';

import TenantLayoutClient from './_components/client/TenantLayoutClient';

export default async function Layout({
  children,
  params: _params,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  // 1. Fetch user data
  const user = await getUser();

  // 2. Fetch team details and all teams
  let teamDetails = null;
  let teamResourceCounts = null;
  let allTeams: Team[] = [];

  if (user) {
    // Get active team details
    const teamResponse = await getActiveTeamDetails();
    if (teamResponse.success && teamResponse.data) {
      if (teamResponse.data.team) {
        teamDetails = teamResponse.data.team;
        // Extract resource counts if available
        teamResourceCounts = teamResponse.data.resourceCounts || null;
      }
    }

    // Get all teams the user belongs to across tenants
    try {
      // getUserTeams returns teams directly, not wrapped in ActionResult
      allTeams = (await getUserTeams(user.id)) as unknown as Team[];
      console.log(`[@layout] Retrieved ${allTeams.length} teams for user`);
    } catch (error) {
      console.error('[@layout] Error fetching user teams:', error);
    }
  }

  // 3. Fetch permissions data
  const permissions = user ? await getUserPermissions(user.id, teamDetails?.id) : null;

  return (
    <TooltipProvider>
      <TenantLayoutClient
        user={user}
        teamDetails={teamDetails as any}
        teamResourceCounts={teamResourceCounts}
        allTeams={allTeams}
        permissions={permissions}
      >
        {children}
      </TenantLayoutClient>
    </TooltipProvider>
  );
}
