'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode, Suspense, useCallback } from 'react';

import { setUserActiveTeam } from '@/app/actions/teamAction';
import { TeamProvider, UserProvider, SidebarProvider, PermissionProvider } from '@/app/providers';
import { HeaderClient, HeaderSkeleton } from '@/components/header';
import { SidebarSkeleton, SidebarClient } from '@/components/sidebar';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function TenantLayoutClient({
  children,
  user,
  teamDetails,
}: {
  children: ReactNode;
  user: User | null;
  teamDetails: Team | null;
}) {
  const teams = teamDetails ? [teamDetails] : [];

  // Create a setSelectedTeam function that calls the server action
  const setSelectedTeam = useCallback(
    async (teamId: string) => {
      if (!user?.id) return;
      return setUserActiveTeam(user.id, teamId);
    },
    [user?.id],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider user={user}>
        <TeamProvider teams={teams} activeTeam={teamDetails} setSelectedTeam={setSelectedTeam}>
          <PermissionProvider>
            <SidebarProvider showTooltips={false}>
              <div className="flex">
                <Suspense fallback={<SidebarSkeleton />}>
                  <aside>
                    <SidebarClient
                      user={user}
                      teams={teams}
                      activeTeam={teamDetails}
                      setSelectedTeam={setSelectedTeam}
                    />
                  </aside>
                </Suspense>
                <div
                  id="main-content"
                  className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
                  data-sidebar-content="main"
                >
                  <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderClient user={user} activeTeam={teamDetails} />
                  </Suspense>
                  <main className="flex-1 px-4 py-2 w-full max-w-full border border-gray-30 rounded-md">
                    {children}
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </PermissionProvider>
        </TeamProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
