'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode, Suspense, useCallback, isValidElement } from 'react';

import { setUserActiveTeam } from '@/app/actions/teamAction';
import { TeamProvider, UserProvider, SidebarProvider, PermissionProvider } from '@/app/providers';
import { HeaderClient, HeaderSkeleton } from '@/components/header';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
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

/**
 * Helper function to wrap content with FeaturePageContainer
 * Much simpler with the enhanced FeaturePageContainer that can extract pageMetadata
 */
function wrapWithFeaturePageContainer(child: ReactNode): ReactNode {
  // Check if child is already a FeaturePageContainer
  if (isValidElement(child) && child.type === FeaturePageContainer) {
    return child;
  }

  // Otherwise just wrap it - FeaturePageContainer will extract metadata if present
  return <FeaturePageContainer>{child}</FeaturePageContainer>;
}

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
                {/* 
                  Main content wrapper - adapts to sidebar state
                  Styling in globals.css: [data-sidebar-content="main"]
                */}
                <div
                  id="main-content"
                  className="flex-1 flex flex-col min-w-0"
                  data-sidebar-content="main"
                >
                  {/* Header - adapts to sidebar state */}
                  <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderClient user={user} activeTeam={teamDetails} />
                  </Suspense>

                  {/* 
                    Main content area - contains the actual page content
                    Height calculated based on header height CSS variable
                  */}
                  <main
                    className="flex-1 border border-gray-30 rounded-md overflow-auto"
                    style={{
                      height: 'calc(100vh - var(--header-height) - 1rem)',
                      marginBottom: '0.5rem',
                      marginRight: '1rem',
                      width: 'calc(100% - 1rem)', // Width minus right margin
                    }}
                  >
                    {/* 
                      Automatically wrap content with FeaturePageContainer
                      The enhanced FeaturePageContainer will extract metadata if available
                      Three ways to provide metadata:
                      1. Wrap with FeaturePageContainer directly (most control)
                      2. Add pageMetadata prop to any component
                      3. Let FeaturePageContainer use defaults
                    */}
                    {wrapWithFeaturePageContainer(children)}
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
