'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode, Suspense } from 'react';

import { TeamProvider, UserProvider, SidebarProvider, PermissionProvider } from '@/app/providers';
import { HeaderClient, HeaderSkeleton } from '@/components/header';
import HeaderEventListener from '@/components/header/HeaderEventListener';
import { SidebarSkeleton, SidebarClient } from '@/components/sidebar';
import { UnifiedHostModalContainer } from '@/components/terminal';
import MobileViewHelper from '@/components/ui/MobileViewHelper';
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
  teamResourceCounts,
  allTeams = [],
  permissions,
}: {
  children: ReactNode;
  user: User | null;
  teamDetails: Team | null;
  teamResourceCounts?: any;
  allTeams?: Team[];
  permissions?: any;
}) {
  // Use allTeams if provided, otherwise fallback to single team array
  const teams = allTeams && allTeams.length > 0 ? allTeams : teamDetails ? [teamDetails] : [];

  // Log teams data to debug
  console.log('[@component:TenantLayoutClient] Teams data:', {
    teamsCount: teams.length,
    activeTeam: teamDetails?.name || 'None',
  });

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider user={user} initialLoading={false}>
        <TeamProvider
          teams={teams}
          activeTeam={teamDetails}
          resourceCounts={teamResourceCounts}
          initialLoading={false}
        >
          <PermissionProvider initialPermissions={permissions}>
            <SidebarProvider showTooltips={false}>
              <HeaderEventListener />
              <MobileViewHelper />
              <div className="flex">
                <Suspense fallback={<SidebarSkeleton />}>
                  <aside>
                    <SidebarClient user={user} teams={teams} activeTeam={teamDetails} />
                  </aside>
                </Suspense>

                <div
                  id="main-content"
                  className="flex-1 flex flex-col min-w-0"
                  data-sidebar-content="main"
                >
                  <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderClient user={user} activeTeam={teamDetails} />
                  </Suspense>

                  <main
                    className="flex-1 border border-gray-30 rounded-md overflow-auto"
                    style={{
                      height: 'calc(100vh - var(--header-height) - 1rem)',
                      marginBottom: '0.5rem',
                      marginRight: '1rem',
                      width: 'calc(100% - 1rem)',
                    }}
                  >
                    {children}
                  </main>
                </div>
              </div>

              {/* Global Modal Container */}
              <UnifiedHostModalContainer />
            </SidebarProvider>
          </PermissionProvider>
        </TeamProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
