'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode, Suspense, useCallback, isValidElement, cloneElement } from 'react';

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
 * Helper function to determine if the child is already a FeaturePageContainer
 * If not, it wraps the child in a FeaturePageContainer
 */
function wrapWithFeaturePageContainer(child: ReactNode, defaultTitle: string = '', defaultDescription: string = ''): ReactNode {
  // Check if child is a FeaturePageContainer by examining its type
  const isFeaturePageContainer = 
    isValidElement(child) && 
    child.type === FeaturePageContainer;

  // If it's already a FeaturePageContainer, return as is
  if (isFeaturePageContainer) {
    return child;
  }

  // If it's a valid React element but not a FeaturePageContainer
  if (isValidElement(child)) {
    // Check if it has its own page metadata
    const pageMetadata = (child.props as any)?.pageMetadata;
    if (pageMetadata) {
      // Use provided metadata
      return (
        <FeaturePageContainer 
          title={pageMetadata.title || defaultTitle}
          description={pageMetadata.description || defaultDescription}
          actions={pageMetadata.actions}
        >
          {child}
        </FeaturePageContainer>
      );
    }
  }

  // Default case: wrap with default FeaturePageContainer
  return (
    <FeaturePageContainer 
      title={defaultTitle}
      description={defaultDescription}
    >
      {child}
    </FeaturePageContainer>
  );
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
                    className="flex-1 px-6 py-4 w-full max-w-full border border-gray-30 rounded-md overflow-auto"
                    style={{ height: 'calc(100vh - var(--header-height) - 1rem)' }}
                  >
                    {/* 
                      Automatically wrap children with FeaturePageContainer if not already wrapped
                      This allows pages to be simpler while maintaining consistent layout
                      Pages can still use their own FeaturePageContainer for custom behavior
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
