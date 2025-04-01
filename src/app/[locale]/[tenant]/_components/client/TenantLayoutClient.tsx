'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode, Suspense } from 'react';

import { TeamProvider, UserProvider, SidebarProvider, PermissionProvider } from '@/app/providers';
import { SidebarSkeleton, SidebarClient } from '@/components/sidebar';
import { WorkspaceHeader, WorkspaceHeaderSkeleton } from '@/components/workspace';
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
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider user={user}>
        <TeamProvider
          teamsDetails={teamDetails ? [teamDetails] : []}
          activeTeam={teamDetails || undefined}
        >
          <PermissionProvider>
            <SidebarProvider user={user}>
              <div className="flex">
                <Suspense fallback={<SidebarSkeleton />}>
                  <aside>
                    <SidebarClient user={user} />
                  </aside>
                </Suspense>
                <div className="flex-1">
                  <Suspense fallback={<WorkspaceHeaderSkeleton />}>
                    <WorkspaceHeader />
                  </Suspense>
                  {children}
                </div>
              </div>
            </SidebarProvider>
          </PermissionProvider>
        </TeamProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
