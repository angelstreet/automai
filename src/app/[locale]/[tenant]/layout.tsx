import { getUserPermissions } from '@/app/actions/permissionAction';
import { getTeamDetails } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import { TooltipProvider } from '@/components/shadcn/tooltip';

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

  // 2. Fetch team details
  let teamDetails = null;
  let teamResourceCounts = null;
  if (user) {
    const teamResponse = await getTeamDetails();
    if (teamResponse.success && teamResponse.data) {
      if (teamResponse.data.team) {
        teamDetails = teamResponse.data.team;
        // Extract resource counts if available
        teamResourceCounts = teamResponse.data.resourceCounts || null;
      }
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
        permissions={permissions}
      >
        {children}
      </TenantLayoutClient>
    </TooltipProvider>
  );
}
