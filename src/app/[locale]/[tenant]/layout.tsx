import { getTeamDetails } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import { TooltipProvider } from '@/components/shadcn/tooltip';

import TenantLayoutClient from './_components/client/TenantLayoutClient';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
  params: { tenant: string; locale: string };
}) {
  const user = await getUser();
  const teamDetails = user ? await getTeamDetails(user.id) : null;

  return (
    <TooltipProvider>
      <TenantLayoutClient user={user} teamDetails={teamDetails}>
        {children}
      </TenantLayoutClient>
    </TooltipProvider>
  );
}
