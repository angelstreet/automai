'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';

import { Team } from '@/app/actions/team';
import { TeamProvider, UserProvider, SidebarProvider } from '@/app/providers';
import { SIDEBAR_COOKIE_NAME } from '@/components/sidebar/constants';
import { User } from '@/types/auth/user';

// Create a client - moved here from server component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

// This client component wraps the layout and provides client-side context providers
export default function TenantLayoutClient({
  children,
  user,
  teams,
  activeTeam,
}: {
  children: ReactNode;
  user: User | null;
  teams: Team[];
  activeTeam: Team | null;
}) {
  console.log('[TenantLayoutClient] Rendering with teams:', teams.length);
  console.log('[TenantLayoutClient] Active team ID:', activeTeam?.id || 'none');
  
  // Get sidebar state from cookies (client-side)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  useEffect(() => {
    // Get sidebar state from cookies on the client
    const sidebarCookie = Cookies.get(SIDEBAR_COOKIE_NAME);
    setSidebarOpen(sidebarCookie !== 'false');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider initialUser={user}>
        <TeamProvider initialTeams={teams} initialActiveTeam={activeTeam}>
          <SidebarProvider defaultOpen={sidebarOpen}>
            <div className="relative flex w-full overflow-hidden">{children}</div>
          </SidebarProvider>
        </TeamProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
